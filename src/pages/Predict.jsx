import { useState, useMemo, useEffect } from 'react';
import { useTournamentCtx, useSavePicks } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { Flag, Stepper } from '../components/Match';
import { isConcreteTeam, timeUntil } from '../lib/tournament';

const lockFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Predict() {
  const { stages, predictionDocs, now, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const savePicks = useSavePicks();

  const savedPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const open = stages.filter((s) => s.open);

  if (!loaded) return <div className="spinner" />;

  return (
    <>
      <div className="page-head">
        <h1>Predict</h1>
        <p>Lock in every match of a stage before its first kick-off. After that the stage is sealed.</p>
      </div>

      {open.length === 0 && <NothingOpen stages={stages} now={now} />}

      {open.map((stage) => (
        <StagePredictor key={stage.id} stage={stage} savedPicks={savedPicks} now={now} savePicks={savePicks} />
      ))}

      {open.length > 0 && <UpcomingHint stages={stages} now={now} />}
    </>
  );
}

function StagePredictor({ stage, savedPicks, now, savePicks }) {
  // Local editable state, seeded from what's saved.
  const [picks, setPicks] = useState({});
  const [status, setStatus] = useState('idle'); // idle | saving | saved

  useEffect(() => {
    const seed = {};
    for (const m of stage.matches) {
      const s = savedPicks[m.id];
      seed[m.id] = s ? { h: s.h, a: s.a } : { h: null, a: null };
    }
    setPicks(seed);
  }, [stage.id, savedPicks]); // eslint-disable-line react-hooks/exhaustive-deps

  const setVal = (id, side, v) => {
    setStatus('idle');
    setPicks((p) => ({ ...p, [id]: { ...p[id], [side]: v } }));
  };

  const complete = (p) => Number.isInteger(p?.h) && Number.isInteger(p?.a);
  const done = stage.matches.filter((m) => complete(picks[m.id])).length;
  const all = stage.matches.length;
  const remaining = timeUntil(stage.lockAt, now);

  async function save() {
    setStatus('saving');
    const toSave = {};
    for (const m of stage.matches) {
      const p = picks[m.id];
      if (complete(p)) toSave[m.id] = { h: p.h, a: p.a };
    }
    try {
      await savePicks(toSave);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('idle');
    }
  }

  return (
    <section style={{ marginBottom: 28 }}>
      <div className="lock-banner">
        <div>
          <div className="eyebrow">{stage.label} · closes in</div>
          <div className="big">{remaining}</div>
          <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
            Locks {stage.lockAt ? lockFmt.format(stage.lockAt) : '—'}
          </div>
        </div>
        <span className="chip open"><span className="mono">{done}/{all}</span> set</span>
      </div>

      <div className="stack">
        {stage.matches.map((m) => {
          const p = picks[m.id] || { h: null, a: null };
          const isComplete = complete(p);
          return (
            <div className="predict-row" key={m.id}>
              <div className="side home">
                {isConcreteTeam(m.homeTeam) ? <Flag team={m.homeTeam} /> : <span className="flag mono-chip">?</span>}
                <span className="name">{m.homeTeam?.name || 'TBD'}</span>
              </div>
              <div className="steppers">
                <Stepper value={p.h} onChange={(v) => setVal(m.id, 'h', v)} />
                <span className="x">:</span>
                <Stepper value={p.a} onChange={(v) => setVal(m.id, 'a', v)} />
              </div>
              <div className="side away">
                {isConcreteTeam(m.awayTeam) ? <Flag team={m.awayTeam} /> : <span className="flag mono-chip">?</span>}
                <span className="name">{m.awayTeam?.name || 'TBD'}</span>
              </div>
              {isComplete && savedPicks[m.id] && savedPicks[m.id].h === p.h && savedPicks[m.id].a === p.a && (
                <div className="your-pick" style={{ borderTop: 0, paddingTop: 0, marginTop: 4 }}>
                  <span className="label">saved</span><span className="dot" style={{ color: 'var(--win)' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }}
        onClick={save} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : `Save ${done} prediction${done === 1 ? '' : 's'}`}
      </button>
      {done < all && (
        <p className="muted center-text" style={{ marginTop: 10, fontSize: '0.8125rem' }}>
          {all - done} match{all - done === 1 ? '' : 'es'} still unpredicted. You can come back and finish before the lock.
        </p>
      )}
    </section>
  );
}

function NothingOpen({ stages, now }) {
  // Find the next stage that exists but isn't open yet (teams not known) or
  // the next thing to wait for.
  const future = stages.find((s) => s.count > 0 && !s.locked && !s.open && !s.finished);
  const nextLocked = stages.find((s) => s.open === false && s.locked && !s.finished);
  return (
    <div className="empty">
      <div className="big">Nothing to predict right now</div>
      {future
        ? <p>The {future.label.toLowerCase()} opens for predictions as soon as the teams are confirmed. Sit tight.</p>
        : nextLocked
          ? <p>The current stage is locked. The next round opens once those teams are decided.</p>
          : <p>Predictions will open here automatically when the next stage's fixtures land.</p>}
    </div>
  );
}

function UpcomingHint({ stages, now }) {
  const future = stages.filter((s) => s.count > 0 && !s.open && !s.locked && !s.finished);
  if (!future.length) return null;
  return (
    <p className="muted center-text" style={{ marginTop: 8, fontSize: '0.8125rem' }}>
      Next: {future.map((s) => s.label).join(', ')} will open when the teams are confirmed.
    </p>
  );
}
