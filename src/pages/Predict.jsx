import { useState, useMemo, useEffect } from 'react';
import { useTournamentCtx, useSavePicks } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { Flag, ScoreInput } from '../components/Match';
import {
  isConcreteTeam, timeUntil, matchEditable, stageComplete, tippableStages,
} from '../lib/tournament';

const lockFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const editFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const LOCK_TEXT = 'Lås allar dystirnar í einum umfari áðrenn fyrsti dysturin verður bríkslaður í gongd. Síðani verður umfarið læst og tað ber ikki til at skráseta nýggjar dystir. Tó ber til at tillaga tipping upp til 1 tíma áðrenn kick-off';

export default function Predict() {
  const { stages, predictionDocs, now, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const savePicks = useSavePicks();

  const savedPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const tippable = useMemo(() => tippableStages(stages, savedPicks), [stages, savedPicks]);

  if (!loaded) return <div className="spinner" />;

  return (
    <>
      <div className="page-head">
        <h1>Tipping</h1>
      </div>

      <div className="lock-note">{LOCK_TEXT}</div>

      {tippable.length === 0 && <NothingOpen stages={stages} />}

      {tippable.map((stage) => (
        <StagePredictor key={stage.id} stage={stage} savedPicks={savedPicks} now={now} savePicks={savePicks} />
      ))}

      {tippable.length > 0 && <UpcomingHint stages={stages} />}
    </>
  );
}

function StagePredictor({ stage, savedPicks, now, savePicks }) {
  const [picks, setPicks] = useState({});
  const [status, setStatus] = useState('idle');

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
  const alreadyComplete = stageComplete(stage, savedPicks);
  const done = stage.matches.filter((m) => complete(picks[m.id])).length;
  const all = stage.matches.length;
  const remaining = timeUntil(stage.firstKickoff, now);

  // After registration locks, only people who already completed the stage may
  // edit, and only matches still inside their 1-hour window.
  const canEditMatch = (m) =>
    matchEditable(m, now) && (!stage.registrationLocked || alreadyComplete);

  async function save() {
    setStatus('saving');
    const toSave = {};
    for (const m of stage.matches) {
      const p = picks[m.id];
      if (complete(p) && canEditMatch(m)) toSave[m.id] = { h: p.h, a: p.a };
    }
    try {
      await savePicks(toSave);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('idle');
    }
  }

  const anyEditable = stage.matches.some(canEditMatch);

  return (
    <section style={{ marginBottom: 28 }}>
      {stage.registrationLocked ? (
        <div className="lock-banner">
          <div>
            <div className="eyebrow">{stage.label}</div>
            <div className="big">Umfar læst</div>
            <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
              Tú kanst tillaga tær dystir, ið ikki eru byrjaðir enn.
            </div>
          </div>
          <span className="chip locked"><span className="mono">{done}/{all}</span></span>
        </div>
      ) : (
        <div className="lock-banner">
          <div>
            <div className="eyebrow">{stage.label} · læsir um</div>
            <div className="big">{remaining}</div>
            <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
              Læsir {stage.firstKickoff ? lockFmt.format(stage.firstKickoff) : '—'}
            </div>
          </div>
          <span className="chip open"><span className="mono">{done}/{all}</span></span>
        </div>
      )}

      <div className="stack">
        {stage.matches.map((m) => {
          const p = picks[m.id] || { h: null, a: null };
          const editable = canEditMatch(m);
          const saved = savedPicks[m.id];
          const isSavedNow = saved && complete(p) && saved.h === p.h && saved.a === p.a;
          return (
            <div className={`predict-row ${editable ? '' : 'locked-row'}`} key={m.id}>
              <div className="side home">
                {isConcreteTeam(m.homeTeam) ? <Flag team={m.homeTeam} /> : <span className="flag mono-chip">?</span>}
                <span className="name">{m.homeTeam?.name || 'TBD'}</span>
              </div>
              <div className="score-box">
                <ScoreInput value={p.h} onChange={(v) => setVal(m.id, 'h', v)} disabled={!editable} ariaLabel="heima mál" />
                <span className="x">:</span>
                <ScoreInput value={p.a} onChange={(v) => setVal(m.id, 'a', v)} disabled={!editable} ariaLabel="úti mál" />
              </div>
              <div className="side away">
                {isConcreteTeam(m.awayTeam) ? <Flag team={m.awayTeam} /> : <span className="flag mono-chip">?</span>}
                <span className="name">{m.awayTeam?.name || 'TBD'}</span>
              </div>
              <div className="meta">
                <span className="kick muted">
                  {editable
                    ? `Tillaga til ${m.kickoff ? editFmt.format(m.kickoff - 60 * 60 * 1000) : '—'}`
                    : 'Læst'}
                </span>
                {isSavedNow && <span className="chip done"><span className="dot" /> goymt</span>}
              </div>
            </div>
          );
        })}
      </div>

      {anyEditable && (
        <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }}
          onClick={save} disabled={status === 'saving'}>
          {status === 'saving' ? 'Goymi…' : status === 'saved' ? 'Goymt ✓' : `Goym tipping (${done}/${all})`}
        </button>
      )}
      {!stage.registrationLocked && done < all && (
        <p className="muted center-text" style={{ marginTop: 10, fontSize: '0.8125rem' }}>
          {all - done} {all - done === 1 ? 'dystur' : 'dystir'} ógoymdir. Øll skulu vera tippað áðrenn umfarið læsir.
        </p>
      )}
    </section>
  );
}

function NothingOpen({ stages }) {
  const future = stages.find((s) => s.count > 0 && !s.locked && !s.open && !s.finished);
  return (
    <div className="empty">
      <div className="big">Eingin tipping júst nú</div>
      {future
        ? <p>{future.label} opnar fyri tipping, so skjótt liðini eru greið.</p>
        : <p>Tipping opnar her sjálvvirkandi, tá ið næsta umfar er klárt.</p>}
    </div>
  );
}

function UpcomingHint({ stages }) {
  const future = stages.filter((s) => s.count > 0 && !s.open && !s.locked && !s.finished);
  if (!future.length) return null;
  return (
    <p className="muted center-text" style={{ marginTop: 8, fontSize: '0.8125rem' }}>
      Næst: {future.map((s) => s.label).join(', ')} opnar tá liðini eru greið.
    </p>
  );
}
