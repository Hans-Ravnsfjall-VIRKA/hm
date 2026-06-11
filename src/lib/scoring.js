// ---------------------------------------------------------------------------
// VIRKA Tippi — scoring engine
//
// Point rules (agreed for this competition):
//   0  wrong outcome (you picked the wrong winner / wrong draw)
//   3  correct outcome only (right winner, or correctly a draw)
//   4  correct outcome AND exactly one team's goal count correct
//   6  exact scoreline (both teams' goals correct)
//   +1 bonus per goal above 4 in the ACTUAL total, but only when the
//      scoreline was exact. Example: exact 3-2 (total 5) -> 6 + 1 = 7.
//      Exact 4-2 (total 6) -> 6 + 2 = 8. Exact 2-2 (total 4) -> 6.
//
// Everything here is pure: no Firebase, no React. That keeps it testable.
// ---------------------------------------------------------------------------

const EXACT_BASE = 6;
const ONE_TEAM = 4;
const OUTCOME = 3;
const BONUS_THRESHOLD = 4; // goals above this in an exact result earn +1 each

/** -1 away win, 0 draw, 1 home win */
function outcome(home, away) {
  if (home > away) return 1;
  if (home < away) return -1;
  return 0;
}

/**
 * Score a single prediction against an actual result.
 * @param {{h:number,a:number}} pick   predicted goals
 * @param {{h:number,a:number}} result actual goals
 * @returns {number} points
 */
export function scorePick(pick, result) {
  if (!pick || !result) return 0;
  if (![pick.h, pick.a, result.h, result.a].every((n) => Number.isInteger(n) && n >= 0)) {
    return 0;
  }

  // Wrong outcome -> nothing.
  if (outcome(pick.h, pick.a) !== outcome(result.h, result.a)) return 0;

  const exactHome = pick.h === result.h;
  const exactAway = pick.a === result.a;

  if (exactHome && exactAway) {
    const total = result.h + result.a;
    const bonus = total > BONUS_THRESHOLD ? total - BONUS_THRESHOLD : 0;
    return EXACT_BASE + bonus;
  }

  if (exactHome || exactAway) return ONE_TEAM;

  return OUTCOME;
}

/** Human-readable breakdown, used in the UI to explain a score. */
export function scoreLabel(points, pick, result) {
  if (!result) return null;
  if (points === 0) return 'No points';
  if (points === OUTCOME) return 'Correct outcome';
  if (points === ONE_TEAM) return 'Outcome + one team';
  if (points >= EXACT_BASE) {
    const bonus = points - EXACT_BASE;
    return bonus > 0 ? `Exact result +${bonus} bonus` : 'Exact result';
  }
  return `${points} pts`;
}

/**
 * Total a player's points across all finished matches.
 * @param {Object} picks   { [matchId]: {h,a} }
 * @param {Array}  matches array of match objects (must have id, finished, result)
 * @returns {{total:number, perMatch:Object}}
 */
export function totalPoints(picks, matches, { includeLive = false } = {}) {
  let total = 0;
  const perMatch = {};
  for (const m of matches) {
    const usable = m.result && (m.finished || (includeLive && m.live));
    if (!usable) continue;
    const pick = picks?.[m.id];
    if (!pick) continue;
    const pts = scorePick(pick, m.result);
    perMatch[m.id] = pts;
    total += pts;
  }
  return { total, perMatch };
}

/**
 * Build a ranked leaderboard from all players' prediction docs + matches.
 * Tie-break: more exact results, then more total correct picks, then name.
 */
export function buildLeaderboard(predictionDocs, matches, { includeLive = false } = {}) {
  const scored = matches.filter((m) => m.result && (m.finished || (includeLive && m.live)));
  const rows = predictionDocs.map((doc) => {
    const { total, perMatch } = totalPoints(doc.picks || {}, scored, { includeLive });
    let exact = 0;
    let played = 0;
    for (const m of scored) {
      const pts = perMatch[m.id];
      if (pts == null) continue;
      if (pts >= EXACT_BASE) exact += 1;
      if (pts > 0) played += 1;
    }
    return {
      uid: doc.uid,
      displayName: doc.displayName || 'Unknown',
      total,
      exact,
      scored: played,
      played: Object.keys(doc.picks || {}).length,
      perMatch,
    };
  });

  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.exact !== a.exact) return b.exact - a.exact;
    if (b.scored !== a.scored) return b.scored - a.scored;
    return a.displayName.localeCompare(b.displayName);
  });

  let rank = 0;
  let prevKey = null;
  rows.forEach((r, i) => {
    const key = `${r.total}-${r.exact}-${r.scored}`;
    if (key !== prevKey) {
      rank = i + 1;
      prevKey = key;
    }
    r.rank = rank;
  });

  return rows;
}

export const POINTS = { EXACT_BASE, ONE_TEAM, OUTCOME, BONUS_THRESHOLD };
