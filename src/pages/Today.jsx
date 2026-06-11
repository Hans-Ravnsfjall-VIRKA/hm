import { useMemo } from 'react';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import MatchCard from '../components/MatchCard';
import MomentCard from '../components/MomentCard';
import CountdownStrip from '../components/CountdownStrip';
import { scorePick } from '../lib/scoring';
import { computeMoments } from '../lib/moments';
import { foLong, foDayShort, sameDay } from '../lib/foDate';

export default function Today() {
  const { matches, predictionDocs, leaderboard, now, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const myPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const moments = useMemo(
    () => computeMoments({ matches, predictionDocs, leaderboard }), [matches, predictionDocs, leaderboard]);

  const today = matches.filter((m) => sameDay(m.kickoff));
  const HOUR = 3600000;
  const live = today.filter((m) => m.live);
  const done = today.filter((m) => m.finished);
  // Kickoff has passed but the feed hasn't marked it live or finished yet
  // (in progress, awaiting data). Should never read "Byrjar seinni".
  const awaiting = today.filter((m) => !m.live && !m.finished && m.kickoff && m.kickoff <= now);
  const upcoming = today.filter((m) => !m.live && !m.finished && m.kickoff && m.kickoff > now);
  const soonList = upcoming.filter((m) => m.kickoff - now <= HOUR);
  const laterList = upcoming.filter((m) => m.kickoff - now > HOUR);
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
                <CountdownStrip kickoff={next.kickoff} />
                {row(next)}
              </div>
            </>
          ) : <p>Sí allar dystirnar undir Dystir.</p>}
        </div>
      )}

      {!today.length && !!moments.length && <MomentCard moments={moments} />}

      {!!live.length && (<><div className="day-label live-label"><span className="live-dot" aria-hidden="true" />Beint nú</div><div className="stack">{live.map(row)}</div></>)}
      {!!awaiting.length && (<><div className="day-label live-label"><span className="live-dot" aria-hidden="true" />Bíðar</div><div className="stack">{awaiting.map(row)}</div></>)}
      {!!soonList.length && (
        <div className="stack">
          {soonList.map((m) => (
            <div key={m.id}><CountdownStrip kickoff={m.kickoff} />{row(m)}</div>
          ))}
        </div>
      )}
      {!!laterList.length && (<><div className="day-label">Byrjar seinni</div><div className="stack">{laterList.map(row)}</div></>)}

      {!!moments.length && <MomentCard moments={moments} />}
      {!!done.length && (<><div className="day-label">Liðugt</div><div className="stack">{done.map(row)}</div></>)}

      {!!today.length && (
        <p className="muted center-text" style={{ marginTop: 14, fontSize: '0.8125rem' }}>
          Trýst á ein dyst fyri at síggja tippingarnar hjá øllum.
        </p>
      )}
    </>
  );
}
