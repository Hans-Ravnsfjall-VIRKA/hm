// ---------------------------------------------------------------------------
// VIRKA Tippi - AUTO-FILL missing predictions at a round's deadline.
//
// Instead of locking a player out of a round they didn't complete, we fill in
// their missing matches when that round closes (its first match kicks off),
// using the same weighted-random scoreline the in-app "Fyll út automatiskt"
// button uses. Everyone ends the deadline with a full card; nobody is shut out.
//
// Safety: this is the ONLY script that writes the `predictions` collection, and
// it ONLY ADDS picks for matches a player left blank. It never overwrites a
// pick someone actually made, and it never touches a match that is already
// finished. Runs on the cron (continue-on-error), cheap: it reads a single
// meta doc and exits until the next deadline is actually due.
//
//   Credentials: FIREBASE_SERVICE_ACCOUNT (base64 JSON, CI) or
//                GOOGLE_APPLICATION_CREDENTIALS (local file path).
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';

// Mirror of the team/lock logic in src/lib/tournament.js. Keep in sync.
const PLACEHOLDER = /(winner|runner|loser|group [a-l]\b|tbd|to be determined|1[a-l]\b|2[a-l]\b|\/)/i;
const isConcrete = (t) => !!(t && t.name && !PLACEHOLDER.test(t.name));
const hasTeams = (m) => isConcrete(m.homeTeam) && isConcrete(m.awayTeam);

// While a future round still has placeholder teams, re-read fixtures hourly so
// we notice when its bracket resolves and a real deadline appears.
const RECHECK_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const EDIT_CUTOFF_MS = 60 * 60 * 1000; // 1h before kickoff - matches src/lib/tournament.js

// The same weighted bag the in-app auto-fill button uses (realistic low scores).
const GOAL_BAG = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3];
const randGoals = () => GOAL_BAG[Math.floor(Math.random() * GOAL_BAG.length)];

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
  console.error('No credentials. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

async function main() {
  initFirebase();
  const db = admin.firestore();
  const now = Date.now();

  // Cheap gate: most runs read only this one doc and exit.
  const metaRef = db.collection('meta').doc('autofill');
  const metaSnap = await metaRef.get();
  const meta = metaSnap.exists ? metaSnap.data() : {};
  const filled = new Set(meta.filledMatches || []);
  if (meta.nextCheck && now < meta.nextCheck) {
    console.log(`autofill: next check ${new Date(meta.nextCheck).toISOString()} - skipping.`);
    return;
  }

  // Load fixtures.
  const matchSnap = await db.collection('matches').get();
  const matches = matchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const concrete = matches.filter(hasTeams);

  // A match's prediction deadline is EDIT_CUTOFF before its own kickoff - the
  // same point the app stops letting you edit it. Per-match (not per-round), so
  // later matches in a round stay open for players even after the round's first
  // match has started. Fill blanks for any concrete match past its deadline
  // that isn't finished and hasn't been filled yet.
  const dueMatches = concrete.filter((m) => (
    m.kickoff != null
    && now >= m.kickoff - EDIT_CUTOFF_MS
    && !m.finished
    && !filled.has(m.id)
  ));

  let totalFills = 0;
  if (dueMatches.length) {
    const predSnap = await db.collection('predictions').get();
    const players = predSnap.docs.map((d) => ({ ref: d.ref, picks: d.data().picks || {} }));
    const ops = [];
    for (const p of players) {
      const addPicks = {};
      for (const m of dueMatches) {
        const ex = p.picks[m.id];
        if (ex && Number.isInteger(ex.h) && Number.isInteger(ex.a)) continue;
        addPicks[m.id] = { h: randGoals(), a: randGoals() };
      }
      if (Object.keys(addPicks).length) ops.push({ ref: p.ref, addPicks });
    }
    for (let i = 0; i < ops.length; i += 400) {
      const batch = db.batch();
      for (const op of ops.slice(i, i + 400)) {
        batch.set(op.ref, {
          picks: op.addPicks,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
    }
    for (const m of dueMatches) filled.add(m.id);
    totalFills = ops.length;
    console.log(`autofill: ${dueMatches.length} match(es) locked -> topped up ${ops.length} player(s).`);
  } else {
    console.log('autofill: no match past its deadline to fill.');
  }

  // Next look: the soonest future match deadline; an hourly recheck while any
  // tie still has placeholder teams (its deadline appears once it resolves);
  // else a day out.
  const candidates = [];
  for (const m of concrete) {
    if (filled.has(m.id) || m.kickoff == null) continue;
    const deadline = m.kickoff - EDIT_CUTOFF_MS;
    if (deadline > now) candidates.push(deadline);
  }
  if (matches.some((m) => !hasTeams(m) && !m.finished)) candidates.push(now + RECHECK_MS);
  const nextCheck = candidates.length ? Math.min(...candidates) : now + DAY_MS;

  await metaRef.set({ filledMatches: [...filled], nextCheck, lastRun: now }, { merge: true });
  console.log(`autofill: done. ${totalFills} fill(s). Next check ${new Date(nextCheck).toISOString()}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
