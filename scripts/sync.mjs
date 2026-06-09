// ---------------------------------------------------------------------------
// VIRKA Tippi — data sync
//
// Pulls World Cup 2026 fixtures + live scores from API-Football and writes
// normalized match documents into Firestore. Clients only ever READ Firestore,
// so the API key and the Firebase service account stay server-side (in GitHub
// Actions secrets). This is what makes the "next stage appears automatically,
// no admin needed" behaviour work: knockout fixtures populate real teams as
// the groups conclude, and the next run writes them straight through.
//
// Run locally to seed:   npm run sync
// Run on a schedule:      .github/workflows/sync.yml (cron)
//
// Required environment variables:
//   APIFOOTBALL_KEY                 API-Football (api-sports.io) key
//   FIREBASE_SERVICE_ACCOUNT        base64-encoded service-account JSON
//     (or) GOOGLE_APPLICATION_CREDENTIALS  path to the JSON file (local dev)
//   LEAGUE_ID                       optional, default 1  (World Cup)
//   SEASON                          optional, default 2026
// ---------------------------------------------------------------------------

import admin from 'firebase-admin';

const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = Number(process.env.LEAGUE_ID || 1);
const SEASON = Number(process.env.SEASON || 2026);
const API_KEY = process.env.APIFOOTBALL_KEY;

if (!API_KEY) {
  console.error('Missing APIFOOTBALL_KEY environment variable.');
  process.exit(1);
}

// --- Firebase admin init ---------------------------------------------------
function initFirebase() {
  if (admin.apps.length) return admin.app();

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS (a path to a JSON file).
  return admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

// --- API helpers -----------------------------------------------------------
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (data.errors && Object.keys(data.errors).length) {
    console.warn('API warnings:', JSON.stringify(data.errors));
  }
  return data.response || [];
}

// --- Stage mapping (kept in sync with src/lib/tournament.js) ----------------
function stageFromRound(round = '') {
  const r = round.toLowerCase();
  if (r.includes('group')) return 'group';
  if (r.includes('round of 32') || r.includes('round-of-32')) return 'r32';
  if (r.includes('round of 16') || r.includes('8th') || r.includes('round-of-16')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';
  if (r.includes('3rd') || r.includes('third')) return 'third';
  if (r.includes('final')) return 'final';
  return 'group';
}

// API-Football short status codes.
const LIVE_STATUS = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT']);
const DONE_STATUS = new Set(['FT', 'AET', 'PEN']);

// Extract a group label ("Group A") from the round string when present.
function groupFromRound(round = '') {
  const m = round.match(/group\s+([a-l])/i);
  return m ? `Group ${m[1].toUpperCase()}` : null;
}

function pickResult(goals, score, status) {
  // Prefer the 90-minute / fulltime scoreline for scoring consistency. If the
  // match went to extra time or penalties we still score on fulltime (90+ET as
  // reported in `fulltime`), per the competition's documented decision.
  const ft = score?.fulltime;
  if (ft && ft.home != null && ft.away != null) {
    return { h: ft.home, a: ft.away };
  }
  if (goals && goals.home != null && goals.away != null) {
    return { h: goals.home, a: goals.away };
  }
  return null;
}

function normalize(fx) {
  const { fixture, league, teams, goals, score } = fx;
  const round = league?.round || '';
  const stageId = stageFromRound(round);
  const status = fixture?.status?.short || 'NS';
  const live = LIVE_STATUS.has(status);
  const finished = DONE_STATUS.has(status);
  const kickoff = fixture?.timestamp ? fixture.timestamp * 1000 : null;
  const result = (live || finished) ? pickResult(goals, score, status) : null;

  const team = (t) => ({
    id: t?.id ?? null,
    name: t?.name ?? 'TBD',
    code: t?.code ?? null,
    flag: t?.logo ?? null, // API-Football uses round flag-style logos for nations
  });

  return {
    id: String(fixture.id),
    stageId,
    round,
    matchday: round,
    group: stageId === 'group' ? groupFromRound(round) : null,
    kickoff,
    date: fixture?.date || null,
    venue: fixture?.venue?.name || null,
    city: fixture?.venue?.city || null,
    homeTeam: team(teams?.home),
    awayTeam: team(teams?.away),
    status,
    live,
    finished,
    elapsed: fixture?.status?.elapsed ?? null,
    result,
  };
}

// --- Main ------------------------------------------------------------------
async function main() {
  initFirebase();
  const db = admin.firestore();

  console.log(`Fetching fixtures: league=${LEAGUE_ID} season=${SEASON} ...`);
  const fixtures = await apiGet('/fixtures', { league: LEAGUE_ID, season: SEASON });
  console.log(`Got ${fixtures.length} fixtures.`);

  if (!fixtures.length) {
    console.warn('No fixtures returned. Check league id / season / plan access.');
  }

  // Write in batches of up to 400 (Firestore limit is 500 ops per batch).
  let written = 0;
  for (let i = 0; i < fixtures.length; i += 400) {
    const slice = fixtures.slice(i, i + 400);
    const batch = db.batch();
    for (const fx of slice) {
      const m = normalize(fx);
      batch.set(db.collection('matches').doc(m.id), m, { merge: true });
      written += 1;
    }
    await batch.commit();
  }

  await db.collection('meta').doc('state').set({
    lastSync: Date.now(),
    season: SEASON,
    leagueId: LEAGUE_ID,
    matchCount: written,
    version: 1,
  }, { merge: true });

  console.log(`Synced ${written} matches. Done.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
