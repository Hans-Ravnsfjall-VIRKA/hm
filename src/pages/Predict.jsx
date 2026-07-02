import { useState, useMemo, useEffect, useRef } from 'react';
import { useTournamentCtx, useSavePicks } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { Flag, ScoreInput } from '../components/Match';
import {
  isConcreteTeam, timeUntil, matchEditable, matchHasTeams, tippableStages,
} from '../lib/tournament';
import { foDateTime } from '../lib/foDate';

const LOCK_TEXT = 'Tippa allar dystirnar í einum umfari áðrenn fyrsti dysturin verður bríkslaður í gongd. Tá fyrsti dystur í umfarinum byrjar, verður umfarið læst og tað ber ikki til at skráseta nýggjar dystir. Tó ber til at tillaga tipping á einkultum dystum upp til 1 tíma áðrenn kick-off, treytað av at hesir vóru tippaðir áðrenn umfarið bleiv læst';

// Weighted toward realistic low scorelines for the auto-fill.
const GOAL_BAG = [0, 0, 0, 1, 1, 1, 1, 2, 2, 3];
const randGoals = () => GOAL_BAG[Math.floor(Math.random() * GOAL_BAG.length)];

export default function Predict() {
  const { stages, predictionDocs, now, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const savePicks = useSavePicks();
  const [confirm, setConfirm] = useState(false);
  const [filling, setFilling] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const prevFocusRef = useRef(null);
  const fillingRef = useRef(false);
  useEffect(() => { fillingRef.current = filling; }, [filling]);

  // Dialog behaviour: move focus in on open, trap Tab within it, close on
  // Escape, and restore focus to the trigger on close.
  useEffect(() => {
    if (!confirm) return undefined;
    prevFocusRef.current = document.activeElement;
    confirmBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (!fillingRef.current) setConfirm(false);
        return;
      }
      if (e.key === 'Tab') {
        const f = dialogRef.current?.querySelectorAll('button:not([disabled])');
        if (!f || !f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prevFocusRef.current?.focus) prevFocusRef.current.focus();
    };
  }, [confirm]);

  const savedPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const tippable = useMemo(() => tippableStages(stages), [stages]);

  // Matches you can still edit that you have not tipped yet (per-match: teams
  // known and inside the match's own edit window).
  const fillable = useMemo(() => {
    const out = [];
    for (const s of tippable) {
      for (const m of s.matches) {
        if (!matchHasTeams(m)) continue;
        if (!matchEditable(m, now)) continue;
        const p = savedPicks[m.id];
        if (!(p && Number.isInteger(p.h) && Number.isInteger(p.a))) out.push(m);
      }
    }
    return out;
  }, [tippable, savedPicks, now]);

  async function autoFill() {
    setFilling(true);
    const picks = {};
    for (const m of fillable) picks[m.id] = { h: randGoals(), a: randGoals() };
    try {
      await savePicks(picks);
    } finally {
      setFilling(false);
      setConfirm(false);
    }
  }

  if (!loaded) return <div className="spinner" />;

  return (
    <>
      <div className="page-head">
        <h1>Tipping</h1>
      </div>

      <div className="lock-note">{LOCK_TEXT}</div>

      {fillable.length > 0 && (
        <button className="btn btn-block" style={{ marginBottom: 16 }} onClick={() => setConfirm(true)}>
          Fyll út automatiskt
        </button>
      )}

      {tippable.length > 0 && (
        <div className="seg" style={{ marginBottom: 16 }}>
          <button className={!showAll ? 'active' : ''} onClick={() => setShowAll(false)}>Komandi dystir</button>
          <button className={showAll ? 'active' : ''} onClick={() => setShowAll(true)}>Vís allar dystir</button>
        </div>
      )}

      {tippable.length === 0 && <NothingOpen stages={stages} />}

      {tippable.map((stage) => (
        <StagePredictor key={stage.id} stage={stage} savedPicks={savedPicks} now={now} savePicks={savePicks} showAll={showAll} />
      ))}

      {tippable.length > 0 && <UpcomingHint stages={stages} />}

      {confirm && (
        <div className="modal-overlay" onClick={() => !filling && setConfirm(false)}>
          <div className="modal" role="dialog" aria-modal="true"
            aria-labelledby="autofill-title" aria-describedby="autofill-desc"
            ref={dialogRef} onClick={(e) => e.stopPropagation()}>
            <h3 id="autofill-title">Fyll út automatiskt</h3>
            <p id="autofill-desc">Hetta útfyllir dystarúrslit á ikki áður útfyltum dystum sjálvvirkandi</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={filling}>Angra</button>
              <button ref={confirmBtnRef} className="btn btn-primary" onClick={autoFill} disabled={filling}>
                {filling ? 'Fylli út…' : 'Útfyll'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StagePredictor({ stage, savedPicks, now, savePicks, showAll }) {
  const [picks, setPicks] = useState({});
  const [busy, setBusy] = useState(0);
  const [failed, setFailed] = useState(false);
  const flash = useRef(null);
  const [, force] = useState(0);

  useEffect(() => {
    const seed = {};
    for (const m of stage.matches) {
      const s = savedPicks[m.id];
      seed[m.id] = s ? { h: s.h, a: s.a } : { h: null, a: null };
    }
    setPicks(seed);
  }, [stage.id, savedPicks]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = (p) => Number.isInteger(p?.h) && Number.isInteger(p?.a);

  // A match is editable purely on its own terms: teams are known and its own
  // 1-hour-before-kickoff window is still open. No round-level lock - you can
  // predict any announced, not-yet-started match.
  const canEditMatch = (m) => matchHasTeams(m) && matchEditable(m, now);

  // Store the moment a match is fully entered - no save button needed.
  async function autosave(m, pick) {
    setFailed(false);
    setBusy((b) => b + 1);
    try {
      await savePicks({ [m.id]: { h: pick.h, a: pick.a } });
      flash.current = m.id;
      force((n) => n + 1);
      setTimeout(() => { if (flash.current === m.id) { flash.current = null; force((n) => n + 1); } }, 2000);
    } catch {
      setFailed(true);
    } finally {
      setBusy((b) => Math.max(0, b - 1));
    }
  }

  const setVal = (m, side, v) => {
    setPicks((prev) => {
      const next = { ...prev, [m.id]: { ...prev[m.id], [side]: v } };
      const p = next[m.id];
      if (complete(p) && canEditMatch(m)) autosave(m, p);
      return next;
    });
  };

  // Only matches whose teams are known can be predicted, so counts and rows are
  // over those. Placeholder ties (e.g. "Round of 32 1 Winner") appear here once
  // their teams resolve.
  const concreteMatches = stage.matches.filter(matchHasTeams);
  const done = concreteMatches.filter((m) => complete(picks[m.id])).length;
  const all = concreteMatches.length;
  const shown = (showAll ? concreteMatches : concreteMatches.filter((m) => !m.finished));
  const remaining = timeUntil(stage.firstKickoff, now);
  const savedAll = concreteMatches.every((m) => {
    const p = picks[m.id]; const s = savedPicks[m.id];
    return complete(p) && s && s.h === p.h && s.a === p.a;
  });

  // Nothing to show right now (all played, or none announced yet).
  if (shown.length === 0) return null;

  return (
    <section style={{ marginBottom: 28 }}>
      {stage.registrationLocked ? (
        <div className="lock-banner">
          <div>
            <div className="eyebrow">{stage.label}</div>
            <div className="big">Umfar læst</div>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
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
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
              {busy > 0 ? 'Goymi…' : failed ? 'Fekk ikki goymt — royn aftur' : savedAll ? 'Alt goymt sjálvvirkandi' : 'Goymist sjálvvirkandi'}
            </div>
          </div>
          <span className="chip open"><span className="mono">{done}/{all}</span></span>
        </div>
      )}

      <div className="stack">
        {shown.map((m) => {
          const p = picks[m.id] || { h: null, a: null };
          const editable = canEditMatch(m);
          const saved = savedPicks[m.id];
          const isSaved = saved && complete(p) && saved.h === p.h && saved.a === p.a;
          return (
            <div className={`predict-row ${editable ? '' : 'locked-row'}`} key={m.id}>
              <div className="side home">
                {isConcreteTeam(m.homeTeam) ? <Flag team={m.homeTeam} /> : <span className="flag mono-chip">?</span>}
                <span className="name">{m.homeTeam?.name || 'TBD'}</span>
              </div>
              <div className="score-box">
                <ScoreInput value={p.h} onChange={(v) => setVal(m, 'h', v)} disabled={!editable} ariaLabel={`Mál hjá ${m.homeTeam?.name || 'heimaliðnum'}`} />
                <span className="x">:</span>
                <ScoreInput value={p.a} onChange={(v) => setVal(m, 'a', v)} disabled={!editable} ariaLabel={`Mál hjá ${m.awayTeam?.name || 'útiliðnum'}`} />
              </div>
              <div className="side away">
                {isConcreteTeam(m.awayTeam) ? <Flag team={m.awayTeam} /> : <span className="flag mono-chip">?</span>}
                <span className="name">{m.awayTeam?.name || 'TBD'}</span>
              </div>
              <div className="meta">
                <span className="kick muted">
                  {editable
                    ? `Tillaga til ${m.kickoff ? foDateTime(m.kickoff - 60 * 60 * 1000) : '—'}`
                    : 'Læst'}
                </span>
                {(isSaved || flash.current === m.id) && <span className="chip done"><span className="dot" /> goymt</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!stage.registrationLocked && done < all && (
        <p className="muted center-text" style={{ marginTop: 12, fontSize: '0.875rem' }}>
          {all - done} {all - done === 1 ? 'dystur' : 'dystir'} ógoymdir. Tippingin goymist sjálv, so skjótt bæði tølini eru útfylt.
        </p>
      )}
    </section>
  );
}

function NothingOpen({ stages }) {
  const future = stages.find((s) => s.count > 0 && !s.locked && !s.open && !s.finished);
  return (
    <div className="empty">
      <div className="big">Eingin tipping nú</div>
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
    <p className="muted center-text" style={{ marginTop: 8, fontSize: '0.875rem' }}>
      Næst: {future.map((s) => s.label).join(', ')} opnar tá liðini eru greið.
    </p>
  );
}
