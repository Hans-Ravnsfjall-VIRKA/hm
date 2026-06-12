// Two-column event timeline, like livescore.com: home-team events sit on the
// left, away-team events on the right, the minute runs down a faint centre
// line, and each goal shows the running scoreline it produced. Reads
// match.events (goals, red cards, missed penalties). Renders nothing when a
// match has no events.

function EventIcon({ t }) {
  if (t === 'red') {
    return (
      <svg className="ev-ico ico-red" viewBox="0 0 16 16" width="13" height="15" aria-hidden="true">
        <rect x="4" y="1.6" width="8" height="12.8" rx="1.6" fill="var(--live)" />
      </svg>
    );
  }
  if (t === 'yellow') {
    return (
      <svg className="ev-ico ico-yellow" viewBox="0 0 16 16" width="13" height="15" aria-hidden="true">
        <rect x="4" y="1.6" width="8" height="12.8" rx="1.6" fill="oklch(0.82 0.16 92)" />
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

// Faroese labels for the second line. FLAGGED for native-speaker review.
function noteFor(e) {
  if (e.t === 'red') return 'Reytt kort';
  if (e.t === 'yellow') return 'Gult kort';
  if (e.t === 'miss') return 'Mistur penalti';
  if (e.og) return 'Sjálvmál';
  if (e.pen) return 'Brotsspark';
  return null;
}

function EvBody({ e, score }) {
  const isGoal = e.t === 'goal';
  const note = noteFor(e);
  return (
    <>
      <span className="evt-ico"><EventIcon t={e.t} /></span>
      <span className="evt-info">
        <span className="evt-name">{e.player || (isGoal ? 'Mál' : '')}</span>
        {isGoal && score ? (
          <span className="evt-score">{score.h}–{score.a}{note ? ` · ${note}` : ''}</span>
        ) : note ? (
          <span className="evt-note">{note}</span>
        ) : null}
      </span>
    </>
  );
}

export default function MatchEvents({ match }) {
  if (!(match.live || match.finished)) return null;
  const events = Array.isArray(match.events) ? match.events : [];
  if (!events.length) return null;

  // Walk the events in order and keep a running scoreline so each goal shows
  // the score it brought the match to (events arrive sorted by minute).
  let h = 0;
  let a = 0;
  const rows = events.map((e) => {
    let score = null;
    if (e.t === 'goal') {
      if (e.side === 'home') h += 1;
      else if (e.side === 'away') a += 1;
      score = { h, a };
    }
    return { e, score, home: e.side === 'home' };
  });

  return (
    <div className="events">
      {rows.map(({ e, score, home }, i) => (
        <div className="evt" key={i}>
          <div className="evt-cell left">{home ? <EvBody e={e} score={score} /> : null}</div>
          <div className="evt-min mono">{e.m || ''}</div>
          <div className="evt-cell right">{!home ? <EvBody e={e} score={score} /> : null}</div>
        </div>
      ))}
    </div>
  );
}
