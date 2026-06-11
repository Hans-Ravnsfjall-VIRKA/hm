// ---------------------------------------------------------------------------
// PROVIDER: football-data.org (free tier).
//
// Returns LIVE/RESULT records for the World Cup. It does NOT invent match ids;
// the overlay writer (scripts/overlay.mjs) joins these records onto the matches
// you already have, by kickoff date + the two teams, and updates only score and
// status. So existing match ids - and every prediction keyed to them - are
// never touched.
//
// One request per run: GET /v4/competitions/WC/matches returns all 104 matches
// with their current status and score. Free tier = 10 requests/minute, which a
// 2-minute sync never approaches.
//
// Env: FOOTBALLDATA_TOKEN (required), FD_COMPETITION (optional, default 'WC').
// ---------------------------------------------------------------------------

export const PROVIDER_NAME = 'football-data.org';

const TOKEN = process.env.FOOTBALLDATA_TOKEN;
const COMP = process.env.FD_COMPETITION || 'WC';
const BASE = 'https://api.football-data.org/v4';

// football-data status -> our model.
function mapStatus(s) {
  if (s === 'IN_PLAY' || s === 'PAUSED') return { status: 'LIVE', live: true, finished: false };
  if (s === 'FINISHED' || s === 'AWARDED') return { status: 'FT', live: false, finished: true };
  return { status: 'NS', live: false, finished: false }; // SCHEDULED/TIMED/POSTPONED/etc.
}

export async function fetchLive() {
  if (!TOKEN) throw new Error('FOOTBALLDATA_TOKEN is not set');

  const res = await fetch(`${BASE}/competitions/${COMP}/matches`, {
    headers: { 'X-Auth-Token': TOKEN },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`football-data ${res.status} ${res.statusText} ${body.slice(0, 160)}`);
  }

  const data = await res.json();
  const list = Array.isArray(data.matches) ? data.matches : [];

  return list.map((m) => {
    const st = mapStatus(m.status);
    const ft = m.score?.fullTime || {};
    const ht = m.score?.halfTime || {};
    // During play, football-data v4 carries the running score in fullTime.
    const h = ft.home != null ? ft.home : (ht.home != null ? ht.home : null);
    const a = ft.away != null ? ft.away : (ht.away != null ? ht.away : null);
    const result = (st.live || st.finished) && h != null && a != null ? { h, a } : null;

    return {
      kickoff: m.utcDate ? Date.parse(m.utcDate) : null,
      date: m.utcDate || null,
      status: st.status,
      live: st.live,
      finished: st.finished,
      result,
      home: { name: m.homeTeam?.name || m.homeTeam?.shortName || null, tla: m.homeTeam?.tla || null },
      away: { name: m.awayTeam?.name || m.awayTeam?.shortName || null, tla: m.awayTeam?.tla || null },
    };
  });
}
