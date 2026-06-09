// ---------------------------------------------------------------------------
// VIRKA Tippi — tournament structure & lock logic
//
// A "stage" is a block of matches that lock together. The rule for this
// competition: every match in a stage must be predicted before the FIRST
// match of that stage kicks off. The group stage is one block (all 72 group
// matches lock when Mexico v South Africa kicks off on 11 June). Each
// knockout round is its own block and locks at its own first kickoff.
//
// Knockout fixtures appear in the data with placeholder teams until the
// groups finish, then the real teams populate automatically. We only let
// people predict a knockout match once both teams are concrete, and we only
// lock the stage once its first real kickoff passes.
// ---------------------------------------------------------------------------

export const STAGES = [
  { id: 'group', label: 'Group stage', short: 'Groups', order: 1 },
  { id: 'r32', label: 'Round of 32', short: 'R32', order: 2 },
  { id: 'r16', label: 'Round of 16', short: 'R16', order: 3 },
  { id: 'qf', label: 'Quarter-finals', short: 'QF', order: 4 },
  { id: 'sf', label: 'Semi-finals', short: 'SF', order: 5 },
  { id: 'third', label: 'Third-place play-off', short: '3rd', order: 6 },
  { id: 'final', label: 'Final', short: 'Final', order: 7 },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/** Map an API round string to one of our stage ids. */
export function stageFromRound(round = '') {
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

const PLACEHOLDER = /(winner|runner|loser|group [a-l]\b|tbd|to be determined|1[a-l]\b|2[a-l]\b|\/)/i;

/** A team slot is "concrete" once a real nation is assigned to it. */
export function isConcreteTeam(team) {
  if (!team || !team.name) return false;
  if (PLACEHOLDER.test(team.name)) return false;
  return true;
}

export function matchHasTeams(m) {
  return isConcreteTeam(m.homeTeam) && isConcreteTeam(m.awayTeam);
}

/**
 * Group matches into stages and compute lock state for each.
 * @param {Array} matches normalized match objects
 * @param {number} now epoch ms
 */
export function buildStages(matches, now = Date.now()) {
  const byStage = {};
  for (const m of matches) {
    (byStage[m.stageId] ||= []).push(m);
  }

  return STAGES.map((stage) => {
    const all = (byStage[stage.id] || []).sort((a, b) => a.kickoff - b.kickoff);
    const concrete = all.filter(matchHasTeams);
    // Lock time = first kickoff among matches that actually have teams.
    const kickoffs = concrete.map((m) => m.kickoff).filter(Boolean);
    const lockAt = kickoffs.length ? Math.min(...kickoffs) : null;

    const exists = all.length > 0;
    const teamsKnown = concrete.length === all.length && all.length > 0;
    const locked = lockAt != null && now >= lockAt;
    // Predictable: the stage exists, every match has real teams, and it
    // hasn't locked yet.
    const open = exists && teamsKnown && !locked;
    const finished = exists && all.every((m) => m.finished);

    return {
      ...stage,
      matches: all,
      count: all.length,
      lockAt,
      locked,
      teamsKnown,
      open,
      finished,
    };
  });
}

/** The stage(s) a player can currently predict, earliest first. */
export function openStages(stages) {
  return stages.filter((s) => s.open);
}

/** Friendly remaining-time string for a lock countdown. */
export function timeUntil(ts, now = Date.now()) {
  if (ts == null) return '';
  let s = Math.max(0, Math.floor((ts - now) / 1000));
  if (s <= 0) return 'locked';
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- Group standings, computed live from finished group matches ------------
// We can show standings even before the API publishes them, and they always
// match whatever match results we have.

export function computeGroupStandings(matches) {
  const groups = {};
  for (const m of matches) {
    if (m.stageId !== 'group' || !m.group) continue;
    (groups[m.group] ||= { name: m.group, teams: {} });
    for (const side of ['homeTeam', 'awayTeam']) {
      const t = m[side];
      if (!isConcreteTeam(t)) continue;
      groups[m.group].teams[t.name] ||= {
        team: t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0,
      };
    }
  }

  for (const m of matches) {
    if (m.stageId !== 'group' || !m.finished || !m.result || !m.group) continue;
    const g = groups[m.group];
    if (!g) continue;
    const home = g.teams[m.homeTeam?.name];
    const away = g.teams[m.awayTeam?.name];
    if (!home || !away) continue;
    const { h, a } = m.result;
    home.P++; away.P++;
    home.GF += h; home.GA += a; away.GF += a; away.GA += h;
    if (h > a) { home.W++; away.L++; home.Pts += 3; }
    else if (h < a) { away.W++; home.L++; away.Pts += 3; }
    else { home.D++; away.D++; home.Pts += 1; away.Pts += 1; }
  }

  return Object.values(groups)
    .map((g) => {
      const table = Object.values(g.teams).map((r) => ({ ...r, GD: r.GF - r.GA }));
      table.sort((a, b) =>
        b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.name.localeCompare(b.team.name));
      return { name: g.name, table };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
