// Liðini: line-ups drawn on a pitch when a formation is available, otherwise
// plain lists. Bench is listed below. Goals and cards are marked on players by
// matching the match events by name.
function shortName(name = '') {
  const parts = String(name).trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

// name -> { goal, yellow, red } counts, from the match timeline.
function marksFromEvents(events) {
  const m = {};
  for (const e of (events || [])) {
    if (!e.player) continue;
    const slot = m[e.player] || (m[e.player] = { goal: 0, yellow: 0, red: 0 });
    if (e.t === 'goal' && !e.og) slot.goal += 1;
    else if (e.t === 'yellow') slot.yellow += 1;
    else if (e.t === 'red') slot.red += 1;
  }
  return m;
}

function Marks({ mk }) {
  if (!mk) return null;
  return (
    <span className="lu-marks">
      {Array.from({ length: mk.goal }).map((_, i) => <span key={`g${i}`} className="lu-mark goal" aria-label="mál" />)}
      {mk.yellow > 0 && <span className="lu-mark yellow" aria-label="gult kort" />}
      {mk.red > 0 && <span className="lu-mark red" aria-label="reytt kort" />}
    </span>
  );
}

function Chip({ p, marks }) {
  return (
    <div className="lu-chip">
      <span className="lu-num">{p.jersey || ''}</span>
      <span className="lu-label"><span className="lu-name">{shortName(p.name)}</span><Marks mk={marks[p.name]} /></span>
    </div>
  );
}

// Bucket starters into formation rows (defense -> attack), GK separate.
function shape(team) {
  const st = [...(team?.starters || [])].filter(Boolean);
  if (!st.length) return null;
  st.sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  const gk = st[0];
  const outfield = st.slice(1);
  const lines = String(team.formation || '').split('-').map((n) => parseInt(n, 10)).filter((n) => n > 0);
  let rows;
  if (lines.length && outfield.length === lines.reduce((a, b) => a + b, 0)) {
    rows = [];
    let i = 0;
    for (const n of lines) { rows.push(outfield.slice(i, i + n)); i += n; }
  } else {
    rows = outfield.length ? [outfield] : [];
  }
  return { gk, rows };
}

function Half({ team, marks, side }) {
  const sh = shape(team);
  if (!sh) return null;
  // Away on top: GK -> attack. Home on bottom: attack -> GK.
  const ordered = side === 'home'
    ? [...[...sh.rows].reverse(), [sh.gk]]
    : [[sh.gk], ...sh.rows];
  return (
    <div className={`pitch-half ${side}`}>
      {ordered.map((row, i) => (
        <div className="lu-row" key={i}>
          {row.filter(Boolean).map((p, j) => <Chip key={j} p={p} marks={marks} />)}
        </div>
      ))}
    </div>
  );
}

function Bench({ team, marks }) {
  const subs = team?.subs || [];
  if (!subs.length) return null;
  return (
    <div className="lu-bench">
      <div className="lu-bench-title">Á bonkinum</div>
      <div className="lu-bench-list">
        {subs.map((p, i) => (
          <span className="lu-bench-row" key={i}>
            <span className="lu-bench-num mono">{p.jersey || ''}</span>
            <span className="lu-name">{shortName(p.name)}</span>
            <Marks mk={marks[p.name]} />
          </span>
        ))}
      </div>
    </div>
  );
}

function List({ team, marks, title }) {
  if (!team) return null;
  const all = [...(team.starters || [])];
  return (
    <div className="lu-listcol">
      <div className="lu-bench-title">{title}{team.formation ? ` · ${team.formation}` : ''}</div>
      <div className="lu-bench-list">
        {all.map((p, i) => (
          <span className="lu-bench-row" key={i}>
            <span className="lu-bench-num mono">{p.jersey || ''}</span>
            <span className="lu-name">{shortName(p.name)}</span>
            <Marks mk={marks[p.name]} />
          </span>
        ))}
      </div>
      <Bench team={team} marks={marks} />
    </div>
  );
}

export default function MatchLineups({ lineups, match }) {
  const home = lineups?.home;
  const away = lineups?.away;
  if (!home && !away) {
    return <div className="empty"><p>Ongar liðuppstillingar enn.</p></div>;
  }
  const marks = marksFromEvents(match?.events);
  const canPitch = (t) => t && t.starters && t.starters.length >= 7;
  const pitch = canPitch(home) && canPitch(away);

  if (pitch) {
    return (
      <div className="lineups">
        <div className="pitch">
          <Half team={away} marks={marks} side="away" />
          <div className="pitch-mid" aria-hidden="true" />
          <Half team={home} marks={marks} side="home" />
        </div>
        <div className="lu-benches">
          <Bench team={home} marks={marks} />
          <Bench team={away} marks={marks} />
        </div>
      </div>
    );
  }
  return (
    <div className="lineups lineups-lists">
      <List team={home} marks={marks} title="Heima" />
      <List team={away} marks={marks} title="Úti" />
    </div>
  );
}
