// Hagtøl: paired stat bars (home vs away), in the style of livescore.com.
// `stats` is [{ label, suffix, home, away }] from the ESPN summary.
function share(home, away) {
  const h = parseFloat(String(home)) || 0;
  const a = parseFloat(String(away)) || 0;
  const t = h + a;
  return t > 0 ? (h / t) * 100 : 50;
}

function fmt(v, suffix) {
  const s = String(v ?? '');
  return suffix && !s.includes(suffix) ? s + suffix : s;
}

export default function MatchStats({ stats }) {
  if (!Array.isArray(stats) || !stats.length) {
    return <div className="empty"><p>Ongar hagtøl enn.</p></div>;
  }
  return (
    <div className="mstats">
      {stats.map((s, i) => {
        const hp = share(s.home, s.away);
        return (
          <div className="mstat" key={i}>
            <div className="mstat-head">
              <span className="mstat-val">{fmt(s.home, s.suffix)}</span>
              <span className="mstat-label">{s.label}</span>
              <span className="mstat-val">{fmt(s.away, s.suffix)}</span>
            </div>
            <div className="mstat-bar" aria-hidden="true">
              <span className="mstat-fill home" style={{ width: `${hp}%` }} />
              <span className="mstat-fill away" style={{ width: `${100 - hp}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
