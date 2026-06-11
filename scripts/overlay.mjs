// ---------------------------------------------------------------------------
// VIRKA Tippi - LIVE-SCORE OVERLAY (id-preserving)
//
// This does NOT re-seed matches and NEVER changes a match id. It reads the
// matches you already have, fetches fresh live data from the provider, joins
// each live record onto an existing match by kickoff DATE + the two teams, and
// updates ONLY status + score on that existing match. Predictions and users
// live in other collections this script never writes, so tips cannot break.
//
//   Dry run (writes NOTHING, just prints the plan):
//     DRY_RUN=1 npm run overlay:local
//   Live (local):
//     npm run overlay:local
//   CI: npm run overlay   (creds via FIREBASE_SERVICE_ACCOUNT)
//
// Safety properties:
//   - provider throws        -> exit, no writes
//   - provider returns 0      -> skip, no writes
//   - a record with no match  -> skipped (never creates a doc)
//   - only changed matches    -> written (merge-only, existing ids only)
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { fetchUpdates, PROVIDER_NAME } from './providers/livescoreapi.mjs';

const DRY = !!process.env.DRY_RUN;

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
  console.error('No credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

// Normalize a country name so the two providers' spellings line up.
const ALIAS = {
  southkorea: 'korearep', korearepublic: 'korearep', korea: 'korearep',
  unitedstates: 'usa', usa: 'usa', unitedstatesofamerica: 'usa',
  iran: 'iran', iriran: 'iran', islamicrepublicofiran: 'iran',
  czechrepublic: 'czechia', czechia: 'czechia',
  cotedivoire: 'ivorycoast', ivorycoast: 'ivorycoast',
  caboverde: 'capeverde', capeverde: 'capeverde',
  turkiye: 'turkey', turkey: 'turkey',
  bosniaandherzegovina: 'bosnia', bosniaherzegovina: 'bosnia', bosnia: 'bosnia',
  democraticrepublicofcongo: 'drcongo', congodr: 'drcongo', drcongo: 'drcongo', congokinshasa: 'drcongo',
  northmacedonia: 'northmacedonia', macedonia: 'northmacedonia',
  unitedarabemirates: 'uae', uae: 'uae',
};
function canon(name) {
  if (!name) return '';
  const s = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALIAS[s] || s;
}
function dayKey(ms) {
  if (ms == null) return '';
  return new Date(ms).toISOString().slice(0, 10);
}
// Join on the two teams only (a pair is effectively unique). Date is not part
// of the key because the live feed gives a kickoff time but no date; when a
// pair somehow has more than one fixture (a group + a knockout rematch), we
// break the tie by nearest kickoff.
function teamPairKey(n1, n2) {
  return [canon(n1), canon(n2)].sort().join('~');
}

async function main() {
  // 1) Pull live data first. Any failure or empty result => no writes at all.
  let updates = [];
  try {
    updates = await fetchUpdates();
  } catch (e) {
    console.error(`Provider "${PROVIDER_NAME}" failed - leaving Firestore untouched.`);
    console.error(e.message || e);
    process.exit(1);
  }
  if (!updates.length) {
    // Empty is normal between matches (no live or recently-finished games).
    console.log(`Provider "${PROVIDER_NAME}" has no live/finished matches right now - nothing to do.`);
    process.exit(0);
  }

  initFirebase();
  const db = admin.firestore();

  // 2) Index existing matches by team pair (a pair can in rare cases map to
  //    more than one fixture, e.g. a knockout rematch, so keep a list).
  const snap = await db.collection('matches').get();
  const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const byPair = new Map();
  for (const m of existing) {
    const k = teamPairKey(m.homeTeam?.name, m.awayTeam?.name);
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(m);
  }
  console.log(`Loaded ${existing.length} existing matches | updates: ${updates.length}${DRY ? ' | DRY RUN' : ''}`);

  // 3) Join + build minimal updates (status/score only), skipping no-ops.
  const ops = [];
  let matched = 0; let unmatched = 0;
  for (const r of updates) {
    const candidates = byPair.get(teamPairKey(r.home.name, r.away.name)) || [];
    let ex = null;
    if (candidates.length === 1) {
      ex = candidates[0];
    } else if (candidates.length > 1) {
      // Tie-break by nearest kickoff to the record (or to now if unknown).
      const ref = r.kickoff != null ? r.kickoff : Date.now();
      ex = candidates.reduce((best, c) =>
        Math.abs((c.kickoff || 0) - ref) < Math.abs((best.kickoff || 0) - ref) ? c : best);
    }
    if (!ex) {
      unmatched += 1;
      if (DRY) console.log(`  (no fixture) ${r.home.name} v ${r.away.name} [${r.status}]`);
      continue;
    }
    matched += 1;

    // Align the score to OUR home/away orientation.
    let result = r.result;
    if (result && canon(ex.homeTeam?.name) !== canon(r.home.name)) {
      result = { h: r.result.a, a: r.result.h };
    }

    const update = { status: r.status, live: r.live, finished: r.finished };
    if (result) update.result = result; // never write null over an existing score

    const sameResult = JSON.stringify(ex.result || null) === JSON.stringify(update.result || ex.result || null);
    const noop = ex.status === update.status && ex.live === update.live
      && ex.finished === update.finished && sameResult;
    if (noop) continue;

    if (DRY) {
      const from = `${ex.status}${ex.result ? ' ' + ex.result.h + '-' + ex.result.a : ''}`;
      const to = `${update.status}${update.result ? ' ' + update.result.h + '-' + update.result.a : (ex.result ? ' ' + ex.result.h + '-' + ex.result.a : '')}`;
      console.log(`  UPDATE ${ex.homeTeam?.name} v ${ex.awayTeam?.name}: ${from} -> ${to}  (id ${ex.id})`);
    } else {
      ops.push({ id: ex.id, update });
    }
  }

  console.log(`${PROVIDER_NAME}: matched=${matched} unmatched=${unmatched} changes=${DRY ? '(dry)' : ops.length}`);
  if (DRY) { console.log('DRY RUN complete - nothing written.'); process.exit(0); }

  // 4) Write only changed matches. Merge-only, existing ids only.
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 400)) {
      batch.set(db.collection('matches').doc(op.id), op.update, { merge: true });
    }
    await batch.commit();
  }
  await db.collection('meta').doc('state').set({
    lastSync: Date.now(), source: PROVIDER_NAME, liveOverlay: true, version: 3,
  }, { merge: true });

  console.log(`Overlay updated ${ops.length} match(es) via ${PROVIDER_NAME}. Done.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
