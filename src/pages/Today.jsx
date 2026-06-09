import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { MatchRow } from '../components/Match';
import { scorePick, scoreLabel } from '../lib/scoring';

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function Today() {
  const { matches, predictionDocs, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const navigate = useNavigate();
  const myPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const today = matches.filter((m) => isToday(m.kickoff));
  const live = today.filter((m) => m.live);
  const upcoming = today.filter((m) => !m.live && !m.finished);
  const done = today.filter((m) => m.finished);
  const next = !today.length ? matches.find((m) => !m.finished && !m.live) : null;

  if (!loaded) return <div className="spinner" />;

  function row(m) {
    const pick = myPicks[m.id];
    const pts = m.finished && pick && m.result ? scorePick(pick, m.result) : null;
    return (
      <MatchRow key={m.id} match={m} yourPick={pick}
        yourPoints={pts} scoreText={pts != null ? scoreLabel(pts, pick, m.result)?.split(' ')[0] : ''}
        onClick={() => navigate(`/match/${m.id}`)} />
    );
  }

  return (
    <>
      <div className="page-head">
        <h1>Today</h1>
        <p>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {!today.length && (
        <div className="empty">
          <div className="big">No matches today</div>
          {next ? (
            <>
              <p>Next up:</p>
              <div style={{ marginTop: 14 }}>{row(next)}</div>
            </>
          ) : <p>Check the fixtures tab for the full schedule.</p>}
        </div>
      )}

      {!!live.length && (<><div className="day-label">Live now</div><div className="stack">{live.map(row)}</div></>)}
      {!!upcoming.length && (<><div className="day-label">Kicking off later</div><div className="stack">{upcoming.map(row)}</div></>)}
      {!!done.length && (<><div className="day-label">Final</div><div className="stack">{done.map(row)}</div></>)}
    </>
  );
}
