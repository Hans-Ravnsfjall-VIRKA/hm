import { useEffect, useState } from 'react';

const HOUR = 3600000;

// Shows in the final hour before kickoff: a bar that sweeps from full to empty
// as the clock runs down, with the remaining time. Hidden outside that window.
export default function CountdownStrip({ kickoff }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!kickoff) return null;
  const remaining = kickoff - now;
  if (remaining <= 0 || remaining > HOUR) return null;

  const frac = remaining / HOUR;            // 1 -> 0 across the hour
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const soon = remaining <= 5 * 60000;      // last 5 minutes

  return (
    <div className={`countdown ${soon ? 'soon' : ''}`} role="timer"
      aria-label={`Dysturin byrjar um ${mins} minuttir`}>
      <div className="countdown-bar" style={{ transform: `scaleX(${frac})` }} />
      <span className="countdown-label">Byrjar um {mins}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
