// Goal + red-card timeline for a match that is being played or has finished.
// Reads match.events (written by the sync). Shows nothing if there are none.
export default function MatchEvents({ match }) {
  if (!(match.live || match.finished)) return null;
  const events = Array.isArray(match.events) ? match.events : [];
  if (!events.length) return null;

  const code = (side) => (side === 'home' ? match.homeTeam?.code : side === 'away' ? match.awayTeam?.code : null);
  const label = (e) => {
    if (e.t === 'red') return 'Reytt kort';
    if (e.og) return 'Sjálvmál';
    if (e.pen) return 'Mál (penalti)';
    return 'Mál';
  };

  return (
    <div className="events">
      {events.map((e, i) => (
        <div className="ev-row" key={i}>
          <span className="ev-min mono">{e.m || ''}</span>
          <span className={`ev-mark ${e.t}`} aria-hidden="true" />
          <span className="ev-text">
            {label(e)}{e.player ? <span className="muted"> · {e.player}</span> : null}
          </span>
          <span className="ev-team mono">{code(e.side) || ''}</span>
        </div>
      ))}
    </div>
  );
}
