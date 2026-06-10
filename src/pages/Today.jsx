import { useMemo } from 'react';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import MatchCard from '../components/MatchCard';
import { scorePick } from '../lib/scoring';
import { foLong, foDayShort, sameDay } from '../lib/foDate';

export default function Today() {
  const { matches, predictionDocs, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const myPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const today = matches.filter((m) => sameDay(m.kickoff));
  const live = today.filter((m) => m.live);
  const upcoming = today.filter((m) => !m.live && !m.finished);
  const done = today.filter((m) => m.finished);
  const next = !today.length ? matches.find((m) => !m.finished && !m.live && m.kickoff) : null;

  if (!loaded) return <div className="spinner" />;

  function row(m) {
    const pick = myPicks[m.id];
    const pts = m.finished && pick && m.result ? scorePick(pick, m.result) : null;
    return <MatchCard key={m.id} match={m} yourPick={pick} yourPoints={pts} />;
  }

  return (
    <>
      <div className="page-head">
        <h1>Í dag</h1>
        <p>{foLong(Date.now())}</p>
      </div>

      {!today.length && (
        <div className="empty">
          <div className="big">Ongir dystir í dag</div>
          {next ? (
            <>
              <p>Næsti dystur:</p>
              <div style={{ marginTop: 14 }}>
                <div className="day-label" style={{ marginTop: 0 }}>{foDayShort(next.kickoff)}</div>
                {row(next)}
              </div>
            </>
          ) : <p>Sí allar dystirnar undir Dystir.</p>}
        </div>
      )}

      {!!live.length && (<><div className="day-label">Beint nú</div><div className="stack">{live.map(row)}</div></>)}
      {!!upcoming.length && (<><div className="day-label">Byrjar seinni</div><div className="stack">{upcoming.map(row)}</div></>)}
      {!!done.length && (<><div className="day-label">Liðugt</div><div className="stack">{done.map(row)}</div></>)}

      {!!today.length && (
        <p className="muted center-text" style={{ marginTop: 14, fontSize: '0.8125rem' }}>
          Trýst á ein dyst fyri at síggja tippingarnar hjá øllum.
        </p>
      )}
    </>
  );
}
