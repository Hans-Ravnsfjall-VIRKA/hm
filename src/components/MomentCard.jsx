import { useEffect, useState } from 'react';

// Rotating "honorable mention" card. Cycles through the computed moments with a
// gentle fade. Pauses on a single moment. Respects reduced-motion via CSS.
export default function MomentCard({ moments }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!moments || moments.length < 2) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % moments.length), 7000);
    return () => clearInterval(id);
  }, [moments]);

  if (!moments || !moments.length) return null;
  const m = moments[i % moments.length];

  return (
    <div className="moment-card" aria-live="polite">
      <span className="moment-label">Vert at nevna</span>
      <p className="moment-text" key={m.id}>{m.text}</p>
    </div>
  );
}
