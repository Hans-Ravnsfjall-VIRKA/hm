import { useEffect, useState } from 'react';

/* global __APP_VERSION__ */
const CURRENT = typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__) : 'dev';

// Polls version.json (the deployed build stamp). When a newer build is live,
// shows a banner offering a reload. The reload preserves the Firebase session
// (it lives in IndexedDB, untouched by a page reload) - nobody is logged out.
export default function UpdateBanner() {
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const r = await fetch('./version.json', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (alive && d?.version) setLatest(String(d.version));
      } catch { /* offline or missing - ignore */ }
    };
    check();
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(check, 5 * 60 * 1000);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); clearInterval(id); };
  }, []);

  if (!latest || latest === CURRENT) return null;

  // Cache-busting reload: fetches a fresh index.html (new hashed assets) while
  // leaving stored auth in place, so the login carries over.
  const reload = () => {
    const u = new URL(window.location.href);
    u.searchParams.set('v', Date.now().toString());
    window.location.replace(u.toString());
  };

  return (
    <div className="update-banner">
      <span>Nýggj útgáva er tøk</span>
      <button onClick={reload}>Dagfør appina</button>
    </div>
  );
}
