// ---------------------------------------------------------------------------
// VIRKA Tippi - tournament structure & lock logic
//
// Locking rule for this competition:
//  - Every match in a stage (umfar) must be tipped before that stage's FIRST
//    match kicks off. That first kickoff is the registration deadline.
//  - After the deadline the stage is locked: nobody who didn't complete it in
//    time can enter it.
//  - If you DID complete the whole stage, you may still adjust any individual
//    match until 1 hour before that match's own kickoff. Each pick then
//    freezes at the 1-hour mark.
//
// Knockout fixtures arrive with placeholder teams until the groups finish,
// then the real teams populate and the stage opens automatically.
// ---------------------------------------------------------------------------

export const EDIT_CUTOFF_MS = 60 * 60 * 1000; // 1 hour before kickoff

export const STAGES = [
  { id: 'group', label: 'Bólkaspæl', short: 'Bólkar', order: 1 },
  { id: 'r32', label: 'Knockout – 32 lið', short: '32-lið', order: 2 },
  { id: 'r16', label: 'Knockout – 16 lið', short: '16-lið', order: 3 },
  { id: 'qf', label: 'Knockout – 8 lið', short: '8-lið', order: 4 },
  { id: 'sf', label: 'Hálvfinala', short: 'Hálvf.', order: 5 },
  { id: 'third', label: 'Dystur um 3. pláss', short: '3. pláss', order: 6 },
  { id: 'final', label: 'Finala', short: 'Finala', order: 7 },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export function stageFromRound(round = '') {
  const r = round.toLowerCase();
  if (r.includes('group')) return 'group';
  if (r.includes('32')) return 'r32';
  if (r.includes('16') || r.includes('8th')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';
  if (r.includes('3rd') || r.includes('third')) return 'third';
  if (r.includes('final')) return 'final';
  return 'group';
}

const PLACEHOLDER = /(winner|runner|loser|group [a-l]\b|tbd|to be determined|1[a-l]\b|2[a-l]\b|\/)/i;

export function isConcreteTeam(team) {
  if (!team || !team.name) return false;
  if (PLACEHOLDER.test(team.name)) return false;
  return true;
}

export function matchHasTeams(m) {
  return isConcreteTeam(m.homeTeam) && isConcreteTeam(m.awayTeam);
}

/** When a single match's pick freezes: 1 hour before kickoff. */
export function matchEditDeadline(m) {
  return m.kickoff ? m.kickoff - EDIT_CUTOFF_MS : null;
}

/** Can this individual match still be edited (purely on time)? */
export function matchEditable(m, now = Date.now()) {
  return m.kickoff != null && now < m.kickoff - EDIT_CUTOFF_MS;
}

/**
 * Group matches into stages and compute lock state for each.
 */
export function buildStages(matches, now = Date.now()) {
  const byStage = {};
  for (const m of matches) {
    (byStage[m.stageId] ||= []).push(m);
  }

  return STAGES.map((stage) => {
    const all = (byStage[stage.id] || []).sort((a, b) => (a.kickoff || 0) - (b.kickoff || 0));
    const concrete = all.filter(matchHasTeams);
    const kickoffs = concrete.map((m) => m.kickoff).filter(Boolean);
    const firstKickoff = kickoffs.length ? Math.min(...kickoffs) : null;

    const exists = all.length > 0;
    const teamsKnown = concrete.length === all.length && all.length > 0;
    // Registration closes when the first match of the stage kicks off.
    const registrationLocked = firstKickoff != null && now >= firstKickoff;
    const open = exists && teamsKnown && !registrationLocked;
    const finished = exists && all.every((m) => m.finished);
    // Any match still inside its edit window?
    const hasEditable = concrete.some((m) => matchEditable(m, now));

    return {
      ...stage,
      matches: all,
      count: all.length,
      lockAt: firstKickoff,
      firstKickoff,
      registrationLocked,
      locked: registrationLocked, // back-compat alias
      teamsKnown,
      open,
      hasEditable,
      finished,
    };
  });
}

/** True if the player has a saved pick for every concrete match in the stage. */
export function stageComplete(stage, picks) {
  const concrete = stage.matches.filter(matchHasTeams);
  if (!concrete.length) return false;
  return concrete.every((m) => {
    const p = picks?.[m.id];
    return p && Number.isInteger(p.h) && Number.isInteger(p.a);
  });
}

/**
 * Stages a player can act on now in the Tipping screen:
 *  - still open for registration, OR
 *  - already locked but the player completed it and some match is still
 *    inside its 1-hour edit window.
 */
export function tippableStages(stages, picks) {
  return stages.filter((s) => {
    if (!s.teamsKnown || !s.count || s.finished) return false;
    if (s.open) return true;
    return s.hasEditable && stageComplete(s, picks);
  });
}

export function openStages(stages) {
  return stages.filter((s) => s.open);
}

export function timeUntil(ts, now = Date.now()) {
  if (ts == null) return '';
  let s = Math.max(0, Math.floor((ts - now) / 1000));
  if (s <= 0) return 'læst';
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `${d}d ${h}t`;
  if (h > 0) return `${h}t ${m}m`;
  return `${m}m`;
}

// --- Group standings, computed live from finished group matches ------------

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
