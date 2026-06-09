import { useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';

export default function Leaderboard() {
  const { leaderboard, matches, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const navigate = useNavigate();
  const finishedCount = matches.filter((m) => m.finished).length;

  if (!loaded) return <div className="spinner" />;

  return (
    <>
      <div className="page-head">
        <h1>Leaderboard</h1>
        <p>{leaderboard.length} player{leaderboard.length === 1 ? '' : 's'} · {finishedCount} match{finishedCount === 1 ? '' : 'es'} scored</p>
      </div>

      {leaderboard.length === 0 ? (
        <div className="empty"><div className="big">No players yet</div><p>Be the first to register and predict.</p></div>
      ) : (
        <div className="stack">
          {leaderboard.map((r) => (
            <div key={r.uid}
              className={`lb-row clickable ${r.uid === user?.uid ? 'me' : ''} ${r.rank <= 3 ? 'podium' : ''}`}
              onClick={() => navigate(`/player/${r.uid}`)}>
              <div className="lb-rank">{r.rank}</div>
              <div>
                <div className="lb-name">{r.displayName}{r.uid === user?.uid && <span className="muted" style={{ fontWeight: 400 }}> · you</span>}</div>
                <div className="lb-meta">{r.exact} exact · {r.scored} scoring · {r.played} picks</div>
              </div>
              <div className="lb-total">{r.total}<small>pts</small></div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
