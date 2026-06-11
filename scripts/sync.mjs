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

  initFirebase();
  const db = admin.firestore();
  console.log(`Provider: ${PROVIDER_NAME} | matches: ${matches.length} | project: ${admin.app().options.projectId || '(default)'}`);

  // Write matches only. NEVER predictions or users - those live in separate
  // collections this script does not write, so the API can never affect them.
  let written = 0;
  for (let i = 0; i < matches.length; i += 400) {
    const batch = db.batch();
    for (const m of matches.slice(i, i + 400)) {
      batch.set(db.collection('matches').doc(m.id), m, { merge: true });
      written += 1;
    }
    await batch.commit();
  }

  await db.collection('meta').doc('state').set({
    lastSync: Date.now(),
    source: PROVIDER_NAME,
    matchCount: written,
    version: 3,
  }, { merge: true });

  console.log(`Synced ${written} matches via ${PROVIDER_NAME}. Done.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
