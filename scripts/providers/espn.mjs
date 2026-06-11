// ---------------------------------------------------------------------------
// PROVIDER: ESPN public scoreboard (no API key required).
//
// This is the ONLY file that knows anything about ESPN. To switch to a
// different data source, write a new file in this folder that exports a
// `fetchMatches()` returning the SAME normalized shape (see MATCH SCHEMA in
// sync.mjs), then change the one import line at the top of sync.mjs. Nothing
// else in the app or the writer needs to change.
// ---------------------------------------------------------------------------

export const PROVIDER_NAME = 'espn';

const LEAGUE = process.env.ESPN_LEAGUE || 'fifa.world';

// Tournament window, fetched in chunks so ESPN never caps a single range.
const RANGES = (process.env.WC_RANGES
  || '20260611-20260620,20260620-20260630,20260630-20260710,20260710-20260721')
  .split(',').map((r) => r.trim());

function scoreboardUrl(range) {
  return `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}/scoreboard?dates=${range}&limit=1000`;
}

// ESPN season slug -> our stage ids. Order matters: quarter/semi finals contain
// the word "final", so they are checked before the final itself.
function stageFromSlug(slug = '') {
  const s = slug.toLowerCase();
  if (s.includes('group')) return 'group';
  if (s.includes('32')) return 'r32';
  if (s.includes('16')) return 'r16';
  if (s.includes('quarter')) return 'qf';
  if (s.includes('semi')) return 'sf';
  if (s.includes('third') || s.includes('3rd')) return 'third';
  if (s.includes('final')) return 'final';
  return 'group';
}

// Goals + red cards from the per-competition "details" (present for
// live/finished matches). ESPN's exact shape varies, so parse defensively.
function extractEvents(comp, homeId, awayId) {
  const details = Array.isArray(comp.details) ? comp.details : [];
  const out = [];
  for (const d of details) {
    const text = (d.type?.text || '').toLowerCase();
    const isGoal = d.scoringPlay === true || text.includes('goal');
    const isRed = d.redCard === true || text.includes('red card');
    if (!isGoal && !isRed) continue;
    const tid = d.team?.id ?? null;
    const side = tid != null && String(tid) === String(homeId) ? 'home'
      : (tid != null && String(tid) === String(awayId) ? 'away' : null);
    const athlete = d.athletesInvolved?.[0];
    const player = athlete?.displayName || athlete?.athlete?.displayName || athlete?.shortName || null;
    const disp = d.clock?.displayValue || null;
    out.push({
      t: isRed ? 'red' : 'goal',
      m: disp,
      min: parseInt(disp || d.clock?.value || '0', 10) || 0,
      side,
      player,
      og: d.ownGoal === true || text.includes('own goal'),
      pen: d.penaltyKick === true || text.includes('penalty'),
    });
  }
  out.sort((a, b) => a.min - b.min);
  return out;
}

// Normalize one ESPN event into our match document (the contract in sync.mjs).
function normalizeEvent(ev) {
  const comp = ev.competitions?.[0] || {};
  const stype = comp.status?.type || {};
  const state = stype.state;          // 'pre' | 'in' | 'post'
  const live = state === 'in';
  const finished = state === 'post' && !!stype.completed;
  const kickoff = ev.date ? Date.parse(ev.date) : null;
  const slug = ev.season?.slug || '';

  const sideBy = (which) =>
    comp.competitors?.find((c) => c.homeAway === which)
    || comp.competitors?.[which === 'home' ? 0 : 1];
  const home = sideBy('home');
  const away = sideBy('away');

  const team = (c) => ({
    id: c?.team?.id ?? null,
    name: c?.team?.displayName ?? 'TBD',
    code: c?.team?.abbreviation ?? null,
    flag: c?.team?.logo ?? null,
  });

  const num = (c) => {
    const n = parseInt(c?.score, 10);
    return Number.isFinite(n) ? n : null;
  };
  const result = (live || finished) && num(home) != null && num(away) != null
    ? { h: num(home), a: num(away) }
    : null;

  let status = 'NS';
  if (finished) status = 'FT';
  else if (live) status = 'LIVE';

  return {
    id: String(ev.id),
    stageId: stageFromSlug(slug),
    round: slug,
    matchday: slug,
    group: null,
    kickoff,
    date: ev.date || null,
    venue: comp.venue?.fullName || null,
    city: comp.venue?.address?.city || null,
    homeTeam: team(home),
    awayTeam: team(away),
    status,
    live,
    finished,
    elapsed: comp.status?.clock ? Math.round(comp.status.clock / 60) : null,
    events: extractEvents(comp, home?.team?.id, away?.team?.id),
    result,
  };
}

async function fetchRange(range) {
  const res = await fetch(scoreboardUrl(range), { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`ESPN ${range} -> ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.events || [];
}

// The provider contract: return an array of normalized match docs.
export async function fetchMatches() {
  const byId = new Map();
  for (const range of RANGES) {
    console.log(`[espn] fetching ${range} ...`);
    const events = await fetchRange(range);
    for (const ev of events) byId.set(String(ev.id), ev);
  }
  return [...byId.values()].map(normalizeEvent);
}
