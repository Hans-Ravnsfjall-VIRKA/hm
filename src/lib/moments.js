// Computes "honorable mention" moments for the Í dag screen from competition
// data. Pure + client-side: predictions and results only, no extra storage.
import { scorePick } from './scoring';
import { sameDay } from './foDate';

const T = {
  exact: [
    'Sodan! {navn} tippaði {h}:{a} og rakti púra rætt!',
    '{navn} visti opinbart úrslitið frammanundan: {h}:{a}.',
    'Perfekt tippað av {navn}: {h}:{a}.',
  ],
  perfect: [
    'Lýtaleyst umfar! {navn} fekk allar dystirnar rættar.',
    'Alt sat! {navn} misti ikki ein einasta dyst.',
  ],
  leader: [
    'Nýggjur oddamaður: {navn} er nú á odda.',
    '{navn} hevur tikið oddasessin við {stig} stigum.',
  ],
  bestDay: [
    'Dagsins besti: {navn} við {stig} stigum í dag.',
    '{navn} fekk flest stig í dag.',
  ],
  upset: [
    'Eingin trúði upp á tað. Uttan {navn}.',
    '{navn} sá tað koma, tá {lið} vann.',
  ],
  streak: [
    '{navn} hevur nú {tal} rættar á rað.',
    '{tal} á rað! Hvør steðgar {navn}?',
  ],
  nobody: [
    'Hesin dysturin lumpaði øll. Eingin fekk hann rættan.',
    '{h}:{a}? Tað sá eingin koma.',
  ],
  everyone: [
    'Eingin ivi her. Øll tippaðu rætt.',
    'Hesin var tryggur: øll høvdu rætt.',
  ],
  bold: [
    '{navn} vágaði sær við {h}:{a}, og rakti.',
    'Her var dirvi! {navn} tippaði {h}:{a} og fekk rætt.',
  ],
  bottom: [
    'Onkur má vera niðast. Í dag er tað {navn}, men í morgin er nýtt høvi.',
    'Tað vendir skjótt í tipping. Í dag er {navn} niðast, men í morgin er aftur ein dagur.',
  ],
};

// Deterministic variant pick so the wording is stable across renders.
function pick(arr, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h + seed.charCodeAt(i)) % 9973;
  return arr[h % arr.length];
}
function fill(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
}
function outcomeOf(r) { return r.h > r.a ? 'H' : r.h < r.a ? 'A' : 'D'; }

export function computeMoments({ matches, predictionDocs, leaderboard }) {
  const out = [];
  const used = new Set(); // dedupe by uid+matchId so one play isn't double-billed
  const docs = predictionDocs || [];
  const name = (d) => d.displayName || 'Spælari';

  const finished = (matches || []).filter((m) => m.finished && m.result);
  const byKickoff = [...finished].sort((a, b) => (a.kickoff || 0) - (b.kickoff || 0));
  const recent = [...byKickoff].reverse(); // newest first

  // 1) Exact-scoreline hits (newest matches first).
  for (const m of recent) {
    for (const d of docs) {
      const p = d.picks?.[m.id];
      if (!p) continue;
      const pts = scorePick(p, m.result);
      const isExact = pts > 0 && p.h === m.result.h && p.a === m.result.a;
      if (!isExact) continue;
      const key = `${d.uid}:${m.id}`;
      if (used.has(key)) continue;
      used.add(key);
      out.push({ id: `exact-${key}`, text: fill(pick(T.exact, key), { navn: name(d), h: m.result.h, a: m.result.a }) });
    }
  }

  // 2) Bold call that landed: a wide/high predicted scoreline, outcome correct
  //    (and not already celebrated as an exact hit).
  for (const m of recent) {
    for (const d of docs) {
      const p = d.picks?.[m.id];
      if (!p) continue;
      const key = `${d.uid}:${m.id}`;
      if (used.has(key)) continue;
      const pts = scorePick(p, m.result);
      const bold = Math.abs(p.h - p.a) >= 3 || (p.h + p.a) >= 5;
      if (pts > 0 && bold) {
        used.add(key);
        out.push({ id: `bold-${key}`, text: fill(pick(T.bold, key), { navn: name(d), h: p.h, a: p.a }) });
      }
    }
  }

  // 3) Upset caller: actual outcome was the minority call, and this player made it.
  for (const m of recent) {
    if (outcomeOf(m.result) === 'D') continue; // need a winner for "{lið} vann"
    const pickers = docs.filter((d) => d.picks?.[m.id]);
    if (pickers.length < 3) continue;
    const act = outcomeOf(m.result);
    const right = pickers.filter((d) => outcomeOf(m.result) === outcomeOf({ h: d.picks[m.id].h, a: d.picks[m.id].a }));
    if (right.length === 0 || right.length > pickers.length / 3) continue; // minority only
    const d = right[0];
    const key = `${d.uid}:${m.id}`;
    if (used.has(key)) continue;
    used.add(key);
    const winner = act === 'H' ? m.homeTeam?.name : m.awayTeam?.name;
    out.push({ id: `upset-${key}`, text: fill(pick(T.upset, key), { navn: name(d), lið: winner || 'liðið' }) });
  }

  // 4) Streak: longest current run of correct outcomes (>=3), trailing.
  let best = null;
  for (const d of docs) {
    let run = 0;
    for (const m of recent) {
      const p = d.picks?.[m.id];
      if (!p) continue;
      if (scorePick(p, m.result) > 0) run += 1; else break;
    }
    if (run >= 3 && (!best || run > best.run)) best = { d, run };
  }
  if (best) out.push({ id: `streak-${best.d.uid}`, text: fill(pick(T.streak, best.d.uid), { navn: name(best.d), tal: best.run }) });

  // 5) Nobody / everyone got a match right (>=3 pickers).
  for (const m of recent) {
    const pickers = docs.filter((d) => d.picks?.[m.id]);
    if (pickers.length < 3) continue;
    const correct = pickers.filter((d) => scorePick(d.picks[m.id], m.result) > 0).length;
    if (correct === 0) out.push({ id: `nobody-${m.id}`, text: fill(pick(T.nobody, m.id), { h: m.result.h, a: m.result.a }) });
    else if (correct === pickers.length) out.push({ id: `everyone-${m.id}`, text: fill(pick(T.everyone, m.id), {}) });
  }

  // 6) Best of the day: most points from matches finished today (Faroe date).
  const todayDone = finished.filter((m) => sameDay(m.kickoff));
  if (todayDone.length) {
    let top = null;
    for (const d of docs) {
      let sum = 0;
      for (const m of todayDone) { const p = d.picks?.[m.id]; if (p) sum += scorePick(p, m.result); }
      if (sum > 0 && (!top || sum > top.sum)) top = { d, sum };
    }
    if (top) out.push({ id: `bestday-${top.d.uid}`, text: fill(pick(T.bestDay, top.d.uid), { navn: name(top.d), stig: top.sum }) });
  }

  // 7) Leader + 8) gentle bottom (need a started competition).
  const board = (leaderboard || []).filter((r) => r.played > 0);
  if (board.length && board[0].total > 0) {
    const l = board[0];
    out.push({ id: `leader-${l.uid}`, text: fill(pick(T.leader, l.uid), { navn: l.displayName, stig: l.total }) });
  }
  if (board.length >= 3 && finished.length > 0) {
    const last = board[board.length - 1];
    out.push({ id: `bottom-${last.uid}`, text: fill(pick(T.bottom, last.uid), { navn: last.displayName }) });
  }

  return out.slice(0, 12);
}
