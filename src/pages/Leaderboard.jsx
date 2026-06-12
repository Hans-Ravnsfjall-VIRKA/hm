import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { buildLeaderboard } from '../lib/scoring';
import { foDayKey, foDateShort } from '../lib/foDate';

export default function Leaderboard() {
  const { matches, predictionDocs, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const navigate = useNavigate();

  const finished = useMemo(
    () => matches.filter((m) => m.finished && m.result && m.kickoff), [matches]);

  // Distinct match days, ascending. Each is a point in the history.
  const days = useMemo(() => {
    const keys = [...new Set(finished.map((m) => foDayKey(m.kickoff)))].sort();
    return keys.map((k) => {
      const ts = finished.find((m) => foDayKey(m.kickoff) === k).kickoff;
      return { key: k, ts };
    });
  }, [finished]);

  // 'now' = the live, full standings. A day key = standings as at end of that day.
  const [sel, setSel] = useState('now');

  // Date chips show PAST days only, newest first. Today is represented by the
  // "Nú" button (current standings), so it is not repeated as its own chip.
  const todayKey = foDayKey(Date.now());
  const dayChips = useMemo(
    () => days.filter((d) => d.key !== todayKey).slice().reverse(),
    [days, todayKey]
  );

  const board = useMemo(() => {
    if (sel === 'now') return buildLeaderboard(predictionDocs, matches, { includeLive: true });
    const upto = finished.filter((m) => foDayKey(m.kickoff) <= sel);
    return buildLeaderboard(predictionDocs, upto);
  }, [sel, finished, matches, predictionDocs]);

  const liveCount = useMemo(() => matches.filter((m) => m.live && m.result).length, [matches]);

  // Movement vs the previous day in the history.
  const prevRanks = useMemo(() => {
    let prevKey = null;
    if (sel === 'now') prevKey = days.length ? days[days.length - 1].key : null;
    else {
      const i = days.findIndex((d) => d.key === sel);
      prevKey = i > 0 ? days[i - 1].key : null;
    }
    if (!prevKey) return null;
    const upto = finished.filter((m) => foDayKey(m.kickoff) <= prevKey);
    const prev = buildLeaderboard(predictionDocs, upto);
    return Object.fromEntries(prev.map((r) => [r.uid, r.rank]));
  }, [sel, days, finished, predictionDocs]);

  if (!loaded) return <div className="spinner" />;

  return (
    <>
      <div className="page-head">
        <h1>Støða</h1>
        <p>{board.length} {board.length === 1 ? 'luttakari' : 'luttakarar'} · {finished.length} {finished.length === 1 ? 'dystur spældur' : 'dystir spældir'}</p>
      </div>

      {sel === 'now' && liveCount > 0 && (
        <div className="live-note">
          <span className="live-dot" aria-hidden="true" />
          Støðan dagførist beint nú · {liveCount} {liveCount === 1 ? 'dystur' : 'dystir'} í gongd
        </div>
      )}

      {dayChips.length > 0 && (
        <div className="hist">
          <button className={sel === 'now' ? 'active' : ''} onClick={() => setSel('now')}>Í dag</button>
          {dayChips.map((d) => (
            <button key={d.key} className={sel === d.key ? 'active' : ''} onClick={() => setSel(d.key)}>
              {foDateShort(d.ts)}
            </button>
          ))}
        </div>
      )}

      {board.length === 0 ? (
        <div className="empty"><div className="big">Eingin spælari enn</div><p>Ver tann fyrsti at stovna brúkara og tippa.</p></div>
      ) : (
        <div className="lb-list">
          {board.map((r) => {
            const prev = prevRanks ? prevRanks[r.uid] : null;
            const delta = prev != null ? prev - r.rank : 0;
            return (
              <div key={r.uid}
                className={`lb-row clickable ${r.uid === user?.uid ? 'me' : ''} ${r.rank <= 3 ? 'podium' : ''}`}
                onClick={() => navigate(`/player/${r.uid}`)}>
                <div className="lb-rank">{r.rank}</div>
                <div>
                  <div className="lb-name">
                    {r.displayName}{r.uid === user?.uid && <span className="muted" style={{ fontWeight: 400 }}> · tú</span>}
                    {delta !== 0 && (
                      <span className={`lb-move ${delta > 0 ? 'up' : 'down'}`}>
                        {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                      </span>
                    )}
                  </div>
                  <div className="lb-meta">{r.exact} rætt · {r.played} tippað</div>
                </div>
                <div className="lb-total">{r.total}<small>stig</small></div>
              </div>
            );
          })}
        </div>
      )}

      {sel !== 'now' && (
        <p className="muted center-text" style={{ marginTop: 14, fontSize: '0.8125rem' }}>
          Støðan sum hon var eftir {foDateShort(days.find((d) => d.key === sel)?.ts)}.
        </p>
      )}
    </>
  );
}
