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

// Mirror of the stage + lock logic in src/lib/tournament.js. Keep in sync.
const STAGE_ORDER = ['group', 'r32', 'r16', 'qf', 'sf', 'third', 'final'];
const PLACEHOLDER = /(winner|runner|loser|group [a-l]\b|tbd|to be determined|1[a-l]\b|2[a-l]\b|\/)/i;
const isConcrete = (t) => !!(t && t.name && !PLACEHOLDER.test(t.name));
const hasTeams = (m) => isConcrete(m.homeTeam) && isConcrete(m.awayTeam);

// While a future round still has placeholder teams, re-read fixtures hourly so
// we notice when its bracket resolves and a real deadline appears.
const RECHECK_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const filled = new Set(meta.filledStages || []);
  if (meta.nextCheck && now < meta.nextCheck) {
    console.log(`autofill: next check ${new Date(meta.nextCheck).toISOString()} - skipping.`);
    return;
  }

  // Load fixtures, group into stages.
  const byStage = {};
  const matchSnap = await db.collection('matches').get();
  for (const d of matchSnap.docs) {
    const m = { id: d.id, ...d.data() };
    (byStage[m.stageId] ||= []).push(m);
  }

  // Per stage: are all teams known, and when is the registration deadline
  // (the first concrete kickoff)?
  const info = {};
  for (const sid of STAGE_ORDER) {
    const all = byStage[sid] || [];
    if (!all.length) continue;
    const concrete = all.filter(hasTeams);
    const teamsKnown = concrete.length === all.length;
    const kicks = concrete.map((m) => m.kickoff).filter((k) => k != null);
    const firstKickoff = kicks.length ? Math.min(...kicks) : null;
    info[sid] = { concrete, teamsKnown, firstKickoff };
  }

  // Rounds whose deadline has passed, teams fully known, not yet filled.
  const due = STAGE_ORDER.filter((sid) => {
    const i = info[sid];
    return i && i.teamsKnown && i.firstKickoff != null && now >= i.firstKickoff && !filled.has(sid);
  });

  let totalFills = 0;
  if (due.length) {
    const predSnap = await db.collection('predictions').get();
    const players = predSnap.docs.map((d) => ({ ref: d.ref, picks: d.data().picks || {} }));

    for (const sid of due) {
      const { concrete } = info[sid];
      const ops = [];
      for (const p of players) {
        const addPicks = {};
        for (const m of concrete) {
          if (m.finished) continue; // never invent a pick for a decided match
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
      filled.add(sid);
      totalFills += ops.length;
      console.log(`autofill: round ${sid} closed -> topped up ${ops.length} player(s).`);
    }
  } else {
    console.log('autofill: no round past its deadline to fill.');
  }

  // Next time to look: the soonest future deadline among unfilled rounds, an
  // hourly recheck while a future round still has placeholder teams, else a day.
  const candidates = [];
  for (const sid of STAGE_ORDER) {
    const i = info[sid];
    if (!i || filled.has(sid)) continue;
    if (i.teamsKnown && i.firstKickoff != null && i.firstKickoff > now) candidates.push(i.firstKickoff);
    else if (!i.teamsKnown) candidates.push(now + RECHECK_MS);
  }
  const nextCheck = candidates.length ? Math.min(...candidates) : now + DAY_MS;

  await metaRef.set({ filledStages: [...filled], nextCheck, lastRun: now }, { merge: true });
  console.log(`autofill: done. ${totalFills} fill(s). Next check ${new Date(nextCheck).toISOString()}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
