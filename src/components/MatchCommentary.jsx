// Frásøgn: ESPN's minute-by-minute commentary (English source text), newest
// first. Each line is classified by its wording so a small, discrete icon can
// mark the key moments: kick-off, goals, penalties, cards, substitutions,
// half/full-time, big chances, offsides, corners and VAR.

function classify(text = '') {
  const t = text.toLowerCase();
  if (/kick-?off|first half begins|second half begins/.test(t)) return 'kickoff';
  if (/first half ends|half-time|half time/.test(t)) return 'half';
  if (/match ends|second half ends|full-time|final whistle/.test(t)) return 'full';
  if (/second yellow|red card|sent off/.test(t)) return 'red';
  if (/yellow card|booked/.test(t)) return 'yellow';
  if (/substitution|\breplaces\b|\breplaced by\b/.test(t)) return 'sub';
  if (/goal!|own goal|scores|back of the net/.test(t)) return 'goal';
  if (/penalty/.test(t)) return 'penalty';
  if (/attempt saved|attempt missed|attempt blocked|hits the (bar|post|crossbar)|saved!|great chance|big chance|denied|woodwork/.test(t)) return 'chance';
  if (/offside/.test(t)) return 'offside';
  if (/\bcorner\b/.test(t)) return 'corner';
  if (/\bvar\b|video review|var decision/.test(t)) return 'var';
  return null;
}

const AMBER = 'oklch(0.82 0.16 92)';

function CommentaryIcon({ type }) {
  const s = { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true };
  switch (type) {
    case 'goal':
      return (
        <svg {...s} className="ci goal">
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="var(--accent)" strokeWidth="1.3" />
          <path d="M8 4.4l2.45 1.78-0.94 2.88H6.49L5.55 6.18z" fill="var(--accent)" />
        </svg>
      );
    case 'penalty':
      return (
        <svg {...s} className="ci">
          <path d="M3.6 10a4.4 4.4 0 0 1 8.8 0" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="10" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'yellow':
      return (<svg {...s} className="ci"><rect x="5.1" y="2.4" width="5.8" height="11.2" rx="1.3" fill={AMBER} /></svg>);
    case 'red':
      return (<svg {...s} className="ci"><rect x="5.1" y="2.4" width="5.8" height="11.2" rx="1.3" fill="var(--live)" /></svg>);
    case 'sub':
      return (
        <svg {...s} className="ci">
          <g strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.6 11V5M4.6 5L3 6.7M4.6 5L6.2 6.7" stroke="var(--accent)" />
            <path d="M11.4 5v6M11.4 11l-1.6-1.7M11.4 11l1.6-1.7" stroke="var(--text-3)" />
          </g>
        </svg>
      );
    case 'kickoff':
      return (
        <svg {...s} className="ci">
          <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'half':
    case 'full':
      return (
        <svg {...s} className="ci">
          <path d="M3 7.2h6a2.4 2.4 0 1 1-2 3.6L3 9.8z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M9.2 7.2V5.4h2.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'chance':
      return (
        <svg {...s} className="ci">
          <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      );
    case 'offside':
    case 'corner':
      return (
        <svg {...s} className="ci">
          <line x1="5" y1="2.6" x2="5" y2="13.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M5 3.2h6.2L9.4 5.3l1.8 2.1H5z" fill="currentColor" />
        </svg>
      );
    case 'var':
      return (
        <svg {...s} className="ci">
          <rect x="2.6" y="4" width="10.8" height="7" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <line x1="6.4" y1="13" x2="9.6" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MatchCommentary({ commentary }) {
  if (!Array.isArray(commentary) || !commentary.length) {
    return <div className="empty"><p>Eingin frásøgn enn.</p></div>;
  }
  return (
    <div className="mcomm">
      {commentary.map((c, i) => {
        const type = classify(c.text);
        return (
          <div className={`mcomm-row ${type ? 'key' : ''}`} key={i}>
            <span className="mcomm-min mono">{c.m || ''}</span>
            <span className="mcomm-ico">{type ? <CommentaryIcon type={type} /> : null}</span>
            <span className="mcomm-text">{c.text}</span>
          </div>
        );
      })}
    </div>
  );
}
