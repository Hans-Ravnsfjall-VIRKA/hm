import { useEffect, useRef, useState } from 'react';

const THRESH = 72;

// Pull down from the top to refresh. Soft-reloads the page (cache-busting) so a
// newer deploy is picked up, while leaving the Firebase session in IndexedDB
// untouched - nobody is logged out. The app is real-time, so this is mostly a
// comfort gesture + a manual "get latest version".
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  useEffect(() => {
    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
    const onStart = (e) => { startY.current = atTop() ? e.touches[0].clientY : null; };
    const onMove = (e) => {
      if (startY.current == null || refreshing) return;
      if (!atTop()) { startY.current = null; setPull(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        setPull(Math.min(dy * 0.5, 96));
        if (dy > 10 && e.cancelable) e.preventDefault();
      }
    };
    const onEnd = () => {
      if (refreshing) { return; }
      setPull((p) => {
        if (p >= THRESH) {
          setRefreshing(true);
          const u = new URL(window.location.href);
          u.searchParams.set('r', Date.now().toString());
          window.location.replace(u.toString());
          return p;
        }
        return 0;
      });
      startY.current = null;
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [refreshing]);

  const ready = pull >= THRESH || refreshing;
  return (
    <div className="ptr" aria-hidden="true"
      style={{ transform: `translateY(${refreshing ? 52 : pull}px)`, opacity: pull > 4 || refreshing ? 1 : 0 }}>
      <span className={`ptr-ring ${ready ? 'ready' : ''} ${refreshing ? 'spin' : ''}`}
        style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }} />
    </div>
  );
}
