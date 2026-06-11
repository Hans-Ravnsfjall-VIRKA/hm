// Event timeline for a match being played or finished. Reads match.events
// (written by the sync): goals, red cards and missed penalties. Goals show a
// football, red cards a red card, missed penalties a struck-through ball.
// Shows nothing when there are no events.

function EventIcon({ t }) {
  if (t === 'red') {
    return (
      <svg className="ev-ico ico-red" viewBox="0 0 16 16" width="13" height="15" aria-hidden="true">
        <rect x="4" y="1.6" width="8" height="12.8" rx="1.6" fill="var(--live)" />
      </svg>
    );
  }
  if (t === 'miss') {
    return (
      <svg className="ev-ico ico-miss" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <circle cx="8" cy="8" r="6.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.1" />
        <path d="M8 4.2l2.55 1.85-0.97 3H6.42l-0.97-3z" fill="currentColor" />
        <line x1="3.1" y1="12.9" x2="12.9" y2="3.1" stroke="var(--live)" strokeWidth="1.7" />
      </svg>
    );
  }
  // goal (incl. penalty + own goal)
  return (
    <svg className="ev-ico ico-goal" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <circle cx="8" cy="8" r="6.6" fill="var(--surface)" stroke="currentColor" strokeWidth="1.1" />
      <path d="M8 4.2l2.55 1.85-0.97 3H6.42l-0.97-3z" fill="currentColor" />
      <path
        d="M8 4.2V2.1M10.58 6.05l1.95-0.62M9.58 9.05l1.25 1.65M6.42 9.05l-1.25 1.65M5.42 6.05l-1.95-0.62"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
      />
    </svg>
  );
}

export default function MatchEvents({ match }) {
  if (!(match.live || match.finished)) return null;
  const events = Array.isArray(match.events) ? match.events : [];
  if (!events.length) return null;

  const code = (side) => (side === 'home' ? match.homeTeam?.code : side === 'away' ? match.awayTeam?.code : null);
  const label = (e) => {
    if (e.t === 'red') return 'Reytt kort';
    if (e.t === 'miss') return 'Mistur penalti';
    if (e.og) return 'Sjálvmál';
    if (e.pen) return 'Mál (penalti)';
    return 'Mál';
  };

  return (
    <div className="events">
      {events.map((e, i) => (
        <div className="ev-row" key={i}>
          <span className="ev-min mono">{e.m || ''}</span>
          <span className="ev-icon"><EventIcon t={e.t} /></span>
          <span className="ev-text">
            {label(e)}{e.player ? <span className="muted"> · {e.player}</span> : null}
          </span>
          <span className="ev-team mono">{code(e.side) || ''}</span>
        </div>
      ))}
    </div>
  );
}
