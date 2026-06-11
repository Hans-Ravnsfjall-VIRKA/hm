// ---------------------------------------------------------------------------
// PROVIDER: live-score-api.com
//
// Returns LIVE + FINISHED records for the World Cup. It does NOT invent match
// ids; the overlay (scripts/overlay.mjs) joins these onto the matches you
// already have, by the two teams (nearest kickoff as tiebreak), and updates
// only score + status. Existing ids and every prediction keyed to them are
// never touched.
//
// Two endpoints per run (well within the free trial's limits):
//   matches/live.json     -> currently playing + finished in the last ~3h
//   matches/history.json  -> finished matches (today + yesterday) as backfill,
//                            so a final is captured even if no sync ran while
//                            the match was inside the ~3h live window.
//
// Env: LIVESCORE_API_KEY, LIVESCORE_API_SECRET,
//      LIVESCORE_COMPETITION_ID (optional, default 362 = FIFA World Cup).
// ---------------------------------------------------------------------------

export const PROVIDER_NAME = 'live-score-api';

const KEY = process.env.LIVESCORE_API_KEY;
const SECRET = process.env.LIVESCORE_API_SECRET;
const COMP = process.env.LIVESCORE_COMPETITION_ID || '362';
const BASE = 'https://livescore-api.com/api-client';

function auth() {
  return `key=${encodeURIComponent(KEY || '')}&secret=${encodeURIComponent(SECRET || '')}`;
}

// "1 - 0" -> { h:1, a:0 }
function parseScore(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/(\d+)\s*-\s*(\d+)/);
  return m ? { h: parseInt(m[1], 10), a: parseInt(m[2], 10) } : null;
}

// live-score-api status/time -> our model.
function mapStatus(status, time) {
  const S = String(status || '').toUpperCase();
  if (S === 'FINISHED') return { status: 'FT', live: false, finished: true };
  if (S === 'NOT STARTED') return { status: 'NS', live: false, finished: false };
  if (S === 'IN PLAY' || S === 'HALF TIME BREAK' || S === 'ADDED TIME' || S === 'INSUFFICIENT DATA') {
    return { status: 'LIVE', live: true, finished: false };
  }
  const t = String(time || '').toUpperCase();
  if (t === 'FT' || t === 'AET' || t === 'AP') return { status: 'FT', live: false, finished: true };
  return { status: 'NS', live: false, finished: false };
}

// Build a normalized record from a live-score-api match object.
// `fallbackDay` (YYYY-MM-DD) is used only for live records, which carry a
// `scheduled` time but no date field.
function toRecord(m, fallbackDay) {
  const st = mapStatus(m.status, m.time);
  const score = parseScore(m.scores?.score) || parseScore(m.scores?.ft_score);
  const result = (st.live || st.finished) && score ? score : null;
  const day = m.date || fallbackDay;            // history has m.date; live does not
  const hm = m.scheduled || '00:00';            // HH:MM UTC
  const kickoff = day ? Date.parse(`${day}T${hm}:00Z`) : null;
  return {
    matchId: String(m.id),
    kickoff,
    status: st.status,
    live: st.live,
    finished: st.finished,
    result,
    home: { name: m.home?.name || null },
    away: { name: m.away?.name || null },
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`live-score-api ${res.status} ${res.statusText} ${body.slice(0, 160)}`);
  }
  const data = await res.json();
  if (data && data.success === false) {
    throw new Error(`live-score-api error: ${data.error || 'unknown'}`);
  }
  return data;
}

function dayUTC(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

export async function fetchUpdates() {
  if (!KEY || !SECRET) throw new Error('LIVESCORE_API_KEY / LIVESCORE_API_SECRET not set');

  // Keep one record per provider match id, preferring the most advanced status.
  const rank = { NS: 0, LIVE: 1, FT: 2 };
  const recs = new Map();
  const add = (r) => {
    const prev = recs.get(r.matchId);
    if (!prev || rank[r.status] >= rank[prev.status]) recs.set(r.matchId, r);
  };

  // 1) Live + recently finished.
  const liveData = await getJson(`${BASE}/matches/live.json?${auth()}&competition_id=${COMP}`);
  for (const m of (liveData?.data?.match || [])) add(toRecord(m, dayUTC(0)));

  // 2) Finished backfill (today + yesterday, UTC).
  const histData = await getJson(`${BASE}/matches/history.json?${auth()}&competition_id=${COMP}&from=${dayUTC(-1)}&to=${dayUTC(0)}`);
  for (const m of (histData?.data?.match || [])) add(toRecord(m, null));

  return [...recs.values()];
}
