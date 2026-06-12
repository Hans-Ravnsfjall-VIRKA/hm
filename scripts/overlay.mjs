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

// While a match is live or about to kick off, a single scheduled run keeps
// polling (every WATCH_INTERVAL) until WATCH_MAX, so live data refreshes far
// faster than the 5-minute cron alone. Between matches it does one pass and
// exits, so idle runs stay cheap.
const WATCH = !DRY && process.env.WATCH !== '0';
const WATCH_INTERVAL_MS = Number(process.env.WATCH_INTERVAL_MS || 60000); // poll cadence during a match
const WATCH_MAX_MS = Number(process.env.WATCH_MAX_MS || 240000);         // stop before the next cron fires
const WATCH_LEAD_MS = Number(process.env.WATCH_LEAD_MS || 360000);       // start polling this long before kickoff
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- ESPN summary fallback for finished-match events -----------------------
// Our fixture id IS the ESPN event id, and the doc stores ESPN team ids, so
// when live-score-api carries no events for a finished match we can pull the
// goals + red cards straight from ESPN's match summary (reliable once a game
// is over, and orientation matches our stored home/away). Public, no key.
const ESPN_LEAGUE = process.env.ESPN_LEAGUE || 'fifa.world';

function espnKeyEvents(data, homeId, awayId) {
  const ke = Array.isArray(data?.keyEvents) ? data.keyEvents : [];
  const out = [];
  for (const d of ke) {
    const text = (d.type?.text || '').toLowerCase();
    const isGoal = d.scoringPlay === true || text.includes('goal');
    const isRed = d.redCard === true || text.includes('red card');
    const isYellow = !isRed && (d.yellowCard === true || text.includes('yellow'));
    if (!isGoal && !isRed && !isYellow) continue;
    const tid = d.team?.id ?? null;
    const side = tid != null && String(tid) === String(homeId) ? 'home'
      : (tid != null && String(tid) === String(awayId) ? 'away' : null);
    const ath = d.participants?.[0]?.athlete || d.athletesInvolved?.[0];
    const player = ath?.displayName || ath?.shortName || null;
    const disp = d.clock?.displayValue || null;
    out.push({
      t: isRed ? 'red' : isYellow ? 'yellow' : 'goal',
      m: disp,
      min: parseInt(disp || '0', 10) || 0,
      side,
      player,
      og: d.ownGoal === true || text.includes('own goal'),
      pen: d.penaltyKick === true || text.includes('penalty'),
    });
  }
  out.sort((a, b) => a.min - b.min);
  return out;
}

async function espnSummaryEvents(id, homeId, awayId) {
  if (!id) return [];
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${ESPN_LEAGUE}/summary?event=${id}&region=us&lang=en&contentorigin=espn`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' }, signal: ctrl.signal });
    if (!res.ok) return [];
    const data = await res.json();
    return espnKeyEvents(data, homeId, awayId);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

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

async function syncOnce(cache = null) {
  // 1) Pull live data first. Any failure or empty result => no writes at all.
  let updates = [];
  try {
    updates = await fetchUpdates();
  } catch (e) {
    console.error(`Provider "${PROVIDER_NAME}" failed - leaving Firestore untouched.`);
    console.error(e.message || e);
    return { error: true };
  }
  if (!updates.length) {
    // Empty is normal between matches (no live or recently-finished games).
    console.log(`Provider "${PROVIDER_NAME}" has no live/finished matches right now - nothing to do.`);
    return { live: false };
  }

  initFirebase();
  const db = admin.firestore();

  // 2) Index existing matches by team pair (a pair can in rare cases map to
  //    more than one fixture, e.g. a knockout rematch, so keep a list).
  //    Within a single run's watch loop we reuse the list (and keep it current
  //    after each write) so we don't re-read the whole collection every poll.
  let existing = cache;
  if (!existing) {
    const snap = await db.collection('matches').get();
    existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  const byPair = new Map();
  for (const m of existing) {
    const k = teamPairKey(m.homeTeam?.name, m.awayTeam?.name);
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(m);
  }
  console.log(`Loaded ${existing.length} existing matches | updates: ${updates.length}${DRY ? ' | DRY RUN' : ''}`);

  // 3) Join + build minimal updates (status/score only), skipping no-ops.
  const STALE_MS = 3.5 * 60 * 60 * 1000; // a match is always over within 3.5h of kickoff
  const ops = [];
  const covered = new Set(); // fixture ids the feed returned this run
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

    // Is our fixture's home the provider's away? Then orientation is flipped.
    const flipped = canon(ex.homeTeam?.name) !== canon(r.home.name);

    // Align the score to OUR home/away orientation.
    let result = r.result;
    if (result && flipped) result = { h: r.result.a, a: r.result.h };

    const update = { status: r.status, live: r.live, finished: r.finished };
    if (result) update.result = result; // never write null over an existing score

    // Live minute: write the elapsed minute + label while live; clear the label
    // at full time so a finished match doesn't keep a stale clock.
    if (r.live) {
      update.elapsed = r.elapsed ?? null;
      update.clock = r.clock ?? null;
    } else if (r.finished) {
      update.elapsed = null;
      update.clock = null;
    }

    // Safety: a real match is over well within 3.5h of kickoff. If the feed
    // still reports it as live that long after kickoff (stale / insufficient
    // data), close it so it can't get stuck on LIVE in the app.
    if (update.live && ex.kickoff && Date.now() - ex.kickoff > STALE_MS) {
      update.status = 'FT';
      update.live = false;
      update.finished = true;
      update.elapsed = null;
      update.clock = null;
    }
    covered.add(ex.id);

    // Events (goals, red cards, missed penalties): the live-score-api events
    // endpoint is authoritative for matches it covers, so when the provider
    // supplies an events array we write the whole list (aligned to our home/away
    // orientation). When it supplies nothing (events fetch failed / not covered)
    // we leave whatever is already on the doc untouched.
    let newEvents = null;
    if (Array.isArray(r.events)) {
      newEvents = r.events.map((e) => (
        flipped
          ? { ...e, side: e.side === 'home' ? 'away' : (e.side === 'away' ? 'home' : e.side) }
          : e
      )).sort((a, b) => (a.min || 0) - (b.min || 0));
      update.events = newEvents;
    }

    // Fallback: live-score-api carries no events for these matches, so pull
    // goals + cards from ESPN's summary (our id is the ESPN event id). Do it
    // every sync while a match is LIVE (new goals show within a poll), and for
    // a FINISHED match until the backfill has a yellow card on it; after that
    // it settles into a no-op.
    const lsHasEvents = Array.isArray(newEvents) && newEvents.length > 0;
    const docHasYellow = Array.isArray(ex.events) && ex.events.some((e) => e.t === 'yellow');
    if (!lsHasEvents && (update.live || (update.finished && !docHasYellow))) {
      const espnEvents = await espnSummaryEvents(ex.id, ex.homeTeam?.id, ex.awayTeam?.id);
      if (espnEvents.length) {
        newEvents = espnEvents;
        update.events = newEvents;
        console.log(`  events via ESPN ${ex.homeTeam?.name} v ${ex.awayTeam?.name}: ${espnEvents.length} live=${!!update.live} (id ${ex.id})`);
      }
    }
    const redCount = newEvents ? newEvents.filter((e) => e.t === 'red').length : 0;

    const sameResult = JSON.stringify(ex.result || null) === JSON.stringify(update.result || ex.result || null);
    const sameEvents = !newEvents || JSON.stringify(ex.events || null) === JSON.stringify(newEvents);
    const sameClock = !('clock' in update) || (ex.clock || null) === (update.clock || null);
    const noop = ex.status === update.status && ex.live === update.live
      && ex.finished === update.finished && sameResult && sameEvents && sameClock;
    if (noop) continue;

    if (DRY) {
      const from = `${ex.status}${ex.result ? ' ' + ex.result.h + '-' + ex.result.a : ''}`;
      const to = `${update.status}${update.result ? ' ' + update.result.h + '-' + update.result.a : (ex.result ? ' ' + ex.result.h + '-' + ex.result.a : '')}`;
      const redNote = redCount ? `  [${redCount} red]` : '';
      const clockNote = update.clock ? `  ${update.clock}` : '';
      console.log(`  UPDATE ${ex.homeTeam?.name} v ${ex.awayTeam?.name}: ${from} -> ${to}${clockNote}${redNote}  (id ${ex.id})`);
    } else {
      ops.push({ id: ex.id, update });
    }
  }

  // Safety net: close any match still flagged live long after kickoff that the
  // feed no longer returns at all (dropped out before a sync caught full time).
  for (const m of existing) {
    if (!m.live || covered.has(m.id)) continue;
    if (!m.kickoff || Date.now() - m.kickoff <= STALE_MS) continue;
    const close = { status: 'FT', live: false, finished: true, clock: null, elapsed: null };
    if (DRY) console.log(`  CLOSE ${m.homeTeam?.name} v ${m.awayTeam?.name}: LIVE -> FT (stale, not in feed, id ${m.id})`);
    else ops.push({ id: m.id, update: close });
  }

  console.log(`${PROVIDER_NAME}: matched=${matched} unmatched=${unmatched} changes=${DRY ? '(dry)' : ops.length}`);
  if (DRY) { console.log('DRY RUN complete - nothing written.'); return { live: updates.some((u) => u.live), matches: existing }; }

  // 4) Write only changed matches. Merge-only, existing ids only.
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + 400)) {
      batch.set(db.collection('matches').doc(op.id), op.update, { merge: true });
    }
    await batch.commit();
  }
  // Keep the in-memory list current so the next poll in this run compares
  // against what we just wrote (and not a stale snapshot).
  for (const op of ops) {
    const m = existing.find((x) => x.id === op.id);
    if (m) Object.assign(m, op.update);
  }
  await db.collection('meta').doc('state').set({
    lastSync: Date.now(), source: PROVIDER_NAME, liveOverlay: true, version: 3,
  }, { merge: true });

  console.log(`Overlay updated ${ops.length} match(es) via ${PROVIDER_NAME}. Done.`);
  return { live: updates.some((u) => u.live), matches: existing };
}

// Cheap check: is any match about to kick off soon? Single-field range query
// (no composite index needed). Lets us poll tightly to catch kickoff fast.
async function kickoffImminent() {
  try {
    initFirebase();
    const db = admin.firestore();
    const now = Date.now();
    const snap = await db.collection('matches')
      .where('kickoff', '>', now)
      .where('kickoff', '<=', now + WATCH_LEAD_MS)
      .limit(5).get();
    return !snap.empty;
  } catch {
    return false;
  }
}

// One scheduled run: sync once, then keep polling while a match is live or
// imminent, until we approach the next cron. Idle runs return after one pass.
async function watch() {
  const start = Date.now();
  let res = await syncOnce();
  if (res.error) process.exit(1);
  if (DRY || !WATCH) process.exit(0);

  let cache = res.matches || null;
  while (Date.now() - start < WATCH_MAX_MS) {
    const keepPolling = res.live || (await kickoffImminent());
    if (!keepPolling) break;
    await sleep(WATCH_INTERVAL_MS);
    res = await syncOnce(cache);
    if (res.error) break;
    cache = res.matches || cache;
  }
  process.exit(0);
}

watch().catch((err) => { console.error(err); process.exit(1); });
