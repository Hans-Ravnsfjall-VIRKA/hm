// ---------------------------------------------------------------------------
// VIRKA Tippi - data sync (provider-agnostic writer)
//
// This script writes match fixtures + live scores into Firestore. It is the
// ONLY writer; clients only ever READ. The actual data source lives behind a
// provider module (scripts/providers/*.mjs) so it can be swapped without
// touching anything else.
//
//   Run locally:  npm run sync   (or npm run seed with .env.local)
//   Credentials:  GOOGLE_APPLICATION_CREDENTIALS (local file path) or
//                 FIREBASE_SERVICE_ACCOUNT (base64 JSON, for CI).
//
// ---------------------------------------------------------------------------
// MATCH SCHEMA (the contract every provider must return)
//   id:        string            unique, stable match id
//   stageId:   'group'|'r32'|'r16'|'qf'|'sf'|'third'|'final'
//   round, matchday: string|null (free-form labels)
//   group:     string|null
//   kickoff:   number|null       epoch ms (UTC)
//   date:      string|null       ISO datetime
//   venue, city: string|null
//   homeTeam, awayTeam: { id, name, code, flag }   (name 'TBD' if unknown)
//   status:    'NS'|'LIVE'|'FT'
//   live, finished: boolean
//   elapsed:   number|null       minutes played
//   events:    [{ t:'goal'|'red', m, min, side:'home'|'away', player, og, pen }]
//   result:    { h:number, a:number } | null
//
// To switch data sources: write scripts/providers/<name>.mjs exporting
// `fetchMatches()` (returns the array above) and `PROVIDER_NAME`, then change
// the single import line below. Nothing else changes.
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

// >>> The only provider-specific line. Swap this import to change data source.
import { fetchMatches, PROVIDER_NAME } from './providers/espn.mjs';

// --- Firebase admin init ---------------------------------------------------
function initFirebase() {
  if (admin.apps.length) return admin.app();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(json), projectId: json.project_id });
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(json), projectId: json.project_id });
  }
  console.error('No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

// --- Main ------------------------------------------------------------------
async function main() {
  // Throttle: fixtures barely change, so running this every 3-minute cron tick
  // is wasteful and (on Firestore's free tier) burns the daily read quota. Run
  // at most once every ~20 minutes; a skipped tick costs a single meta read.
  initFirebase();
  const db = admin.firestore();
  const MIN_INTERVAL_MS = 20 * 60 * 1000;
  const gateRef = db.collection('meta').doc('fixturesync');
  const gateSnap = await gateRef.get();
  const lastRun = (gateSnap.exists && gateSnap.data().lastRun) || 0;
  if (Date.now() - lastRun < MIN_INTERVAL_MS) {
    console.log(`fixture sync: ran ${Math.round((Date.now() - lastRun) / 60000)} min ago - skipping.`);
    return;
  }
  // Start the skip window now, so even if the provider fetch below fails we
  // don't retry every tick (fixtures aren't urgent).
  await gateRef.set({ lastRun: Date.now() }, { merge: true });

  // Pull from the provider FIRST. If the source is down or access is lost this
  // throws (or returns nothing) and we exit WITHOUT writing - so existing data
  // and, crucially, all predictions are never touched. Writes are merge-only,
  // so a partial pull can only add/update, never delete.
  let matches = [];
  try {
    matches = await fetchMatches();
  } catch (err) {
    console.error(`Provider "${PROVIDER_NAME}" failed - leaving Firestore untouched.`);
    console.error(err.message || err);
    process.exit(1);
  }

  // Zero-guard: a successful-but-empty response (outage, wrong window, schema
  // change) must NOT overwrite good data. Skip the write entirely.
  if (!matches.length) {
    console.warn(`Provider "${PROVIDER_NAME}" returned 0 matches - skipping write to protect existing data.`);
    process.exit(0);
  }

  console.log(`Provider: ${PROVIDER_NAME} | matches: ${matches.length} | project: ${admin.app().options.projectId || '(default)'}`);

  // Which matches already exist? For those we refresh ONLY fixture identity
  // (teams, kickoff, venue, stage) so this can run safely alongside the live
  // overlay: it can never overwrite a live score, a finished result, or the
  // overlay's events. Crucially, this is also how a knockout fixture seeded
  // earlier with placeholder teams ("Winner Group A") gets its real teams once
  // the bracket is set. New fixtures (a round that didn't exist yet) are
  // written in full. NEVER predictions or users - those are separate collections.
  const existingSnap = await db.collection('matches').get();
  const existing = new Map(existingSnap.docs.map((d) => [d.id, d.data()]));
  const identityOf = (m) => ({
    stageId: m.stageId,
    round: m.round,
    matchday: m.matchday,
    group: m.group,
    kickoff: m.kickoff,
    date: m.date,
    venue: m.venue,
    city: m.city,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
  });
  // Order-independent signature of just the fixture-identity fields, so we can
  // tell whether anything actually changed and skip writing otherwise. This is
  // what makes it cheap to run every few minutes: a run that finds no new
  // fixtures and no team/kickoff changes writes nothing at all.
  const teamKey = (t) => (t ? `${t.id}|${t.name}|${t.code}|${t.flag}` : '');
  const idSig = (o) => [
    o.stageId, o.round, o.matchday, o.group, o.kickoff, o.date,
    o.venue, o.city, teamKey(o.homeTeam), teamKey(o.awayTeam),
  ].join('~');

  // Decide what to write: full doc for brand-new fixtures, identity-only for
  // existing fixtures whose identity changed (e.g. a knockout placeholder
  // resolving to real teams). Existing live fields are never touched.
  const plan = [];
  let created = 0;
  for (const m of matches) {
    const ex = existing.get(m.id);
    if (!ex) { plan.push({ id: m.id, data: m }); created += 1; continue; }
    if (idSig(ex) !== idSig(m)) plan.push({ id: m.id, data: identityOf(m) });
  }

  if (!plan.length) {
    console.log(`No fixture changes (${matches.length} checked) - nothing written.`);
    process.exit(0);
  }

  let written = 0;
  for (let i = 0; i < plan.length; i += 400) {
    const batch = db.batch();
    for (const p of plan.slice(i, i + 400)) {
      batch.set(db.collection('matches').doc(p.id), p.data, { merge: true });
      written += 1;
    }
    await batch.commit();
  }

  await db.collection('meta').doc('state').set({
    lastSync: Date.now(),
    source: PROVIDER_NAME,
    matchCount: existing.size + created,
    version: 3,
  }, { merge: true });

  console.log(`Synced ${written} fixture change(s) via ${PROVIDER_NAME} (${created} new). Done.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
