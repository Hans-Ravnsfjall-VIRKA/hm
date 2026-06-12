import { useMemo } from 'react';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import MatchCard from '../components/MatchCard';
import CountdownStrip from '../components/CountdownStrip';
import { scorePick } from '../lib/scoring';
import { isLiveNow } from '../lib/tournament';
import { foLong, foDayShort, sameDay } from '../lib/foDate';

export default function Today() {
  const { matches, predictionDocs, now, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const myPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const today = matches.filter((m) => sameDay(m.kickoff));
  const HOUR = 3600000;
  // Live = anything whose kickoff has passed and isn't finished yet, so a match
  // starts in the app on time without waiting for the sync to flip its status.
  const live = today.filter((m) => isLiveNow(m, now));
  const done = today.filter((m) => m.finished);
  const upcoming = today.filter((m) => !m.finished && m.kickoff && m.kickoff > now);
  const soonList = upcoming.filter((m) => m.kickoff - now <= HOUR);
  const laterList = upcoming.filter((m) => m.kickoff - now > HOUR);

  // The soonest match still to be played, today or on a later day.
  const next = matches
    .filter((m) => !m.finished && !m.live && m.kickoff && m.kickoff > now)
    .sort((a, b) => a.kickoff - b.kickoff)[0] || null;

  if (!loaded) return <div className="spinner" />;

  function row(m) {
    const pick = myPicks[m.id];
    const pts = m.finished && pick && m.result ? scorePick(pick, m.result) : null;
    return <MatchCard key={m.id} match={m} yourPick={pick} yourPoints={pts} />;
  }

  // "Næsti dystur" block. Shown when there is nothing upcoming today (so it can
  // point at a future day) but a future match exists.
  const nextBlock = next ? (
    <>
      <div className="day-label">Næsti dystur</div>
      <div className="stack">
        <div>
          {!sameDay(next.kickoff) && <div className="next-day">{foDayShort(next.kickoff)}</div>}
          <CountdownStrip kickoff={next.kickoff} />
          {row(next)}
        </div>
      </div>
    </>
  ) : null;

  const noUpcomingToday = !soonList.length && !laterList.length;

  return (
    <>
      <div className="page-head">
        <h1>Í dag</h1>
        <p>{foLong(Date.now())}</p>
      </div>

      {!today.length && (
        <div className="empty">
          <div className="big">Ongir dystir í dag</div>
          {!next && <p>Sí allar dystirnar undir Dystir.</p>}
        </div>
      )}

      {!today.length && nextBlock}

      {!!live.length && (<><div className="day-label live-label"><span className="live-dot" aria-hidden="true" />Beint nú</div><div className="stack">{live.map(row)}</div></>)}
      {!!soonList.length && (
        <div className="stack">
          {soonList.map((m) => (
            <div key={m.id}><CountdownStrip kickoff={m.kickoff} />{row(m)}</div>
          ))}
        </div>
      )}
      {!!laterList.length && (<><div className="day-label">Seinni</div><div className="stack">{laterList.map(row)}</div></>)}

      {!!done.length && (<><div className="day-label">Liðugt</div><div className="stack">{done.map(row)}</div></>)}

      {!!today.length && noUpcomingToday && nextBlock}

      {!!today.length && (
        <p className="muted center-text" style={{ marginTop: 14, fontSize: '0.8125rem' }}>
          Trýst á ein dyst fyri at síggja tippingarnar hjá øllum.
        </p>
      )}
    </>
  );
}
