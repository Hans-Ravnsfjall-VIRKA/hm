import { isConcreteTeam, isLiveNow } from '../lib/tournament';
import { foTime } from '../lib/foDate';
import { useTournamentCtx } from '../hooks/useData';

// The live minute to show. Prefer the provider's clock ("67'", "Hálvleikur"),
// then its elapsed number; if the feed gives neither, estimate from kickoff so
// a live match still shows progress instead of a bare "LIVE".
function liveMinuteLabel(clock, elapsed, kickoff, now) {
  if (clock) return clock;
  if (elapsed) return `${elapsed}'`;
  if (kickoff && now > kickoff) {
    const mins = Math.floor((now - kickoff) / 60000);
    if (mins <= 0) return "1'";
    if (mins > 90) return "90+'";
    return `${mins}'`;
  }
  return 'LIVE';
}

/** Country flag. Uses the synced flag URL; falls back to a mono monogram. */
export function Flag({ team }) {
  const code = team?.code;
  if (team?.flag) {
    return (
      <span className="flag">
        <img src={team.flag} alt="" loading="lazy" />
      </span>
    );
  }
  const mono = (code || team?.name || '??').slice(0, 3).toUpperCase();
  return <span className="flag mono-chip">{mono}</span>;
}

function TeamSide({ team, side, reds = 0 }) {
  const concrete = isConcreteTeam(team);
  return (
    <div className={`side ${side}`}>
      {concrete ? <Flag team={team} /> : <span className="flag mono-chip">?</span>}
      <span className={`name ${concrete ? '' : 'tbd'}`}>
        {concrete ? team.name : (team?.name || 'TBD')}
      </span>
      {reds > 0 && (
        <span className="redcard" title="Reytt kort" aria-label={`${reds} reytt kort`}>
          {reds > 1 ? reds : ''}
        </span>
      )}
    </div>
  );
}

/** A read-only match row. Shows result if finished, live score if live,
 *  kickoff time otherwise. Optionally shows the viewer's own pick + points. */
export function MatchRow({ match, yourPick, yourPoints, scoreText, onClick }) {
  const { homeTeam, awayTeam, finished, result, elapsed, clock, kickoff } = match;
  const { now } = useTournamentCtx();
  const liveNow = isLiveNow(match, now);

  const reds = (liveNow || finished) && Array.isArray(match.events)
    ? match.events.filter((e) => e.t === 'red') : [];
  const redHome = reds.filter((e) => e.side === 'home').length;
  const redAway = reds.filter((e) => e.side === 'away').length;

  let center;
  if (finished && result) {
    center = (
      <div className="center">
        <div className="score"><span>{result.h}</span><span className="sep">:</span><span>{result.a}</span></div>
        <div className="kick">Liðugt</div>
      </div>
    );
  } else if (liveNow) {
    // Live from kickoff. Show the feed's score once it arrives; until then a
    // 0:0 placeholder so a just-started match reads as in-progress, not waiting.
    const r = result || { h: 0, a: 0 };
    center = (
      <div className="center">
        <div className="score live-score"><span>{r.h}</span><span className="sep">:</span><span>{r.a}</span></div>
        <div className="elapsed">{liveMinuteLabel(clock, elapsed, kickoff, now)}</div>
      </div>
    );
  } else {
    center = (
      <div className="center">
        <div className="kick">{match.kickoff ? foTime(match.kickoff) : '—'}</div>
      </div>
    );
  }

  return (
    <div className={`match ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <TeamSide team={homeTeam} side="home" reds={redHome} />
      {center}
      <TeamSide team={awayTeam} side="away" reds={redAway} />
      {(yourPick || yourPoints != null) && (
        <div className="your-pick">
          <span className="label">Tín tipping</span>
          <span>
            {yourPick
              ? <span className="val mono">{yourPick.h}:{yourPick.a}</span>
              : <span className="muted">eingin</span>}
            {yourPoints != null && (
              <span className={`pts-badge ${yourPoints >= 6 ? 'exact' : yourPoints > 0 ? 'scored' : 'zero'}`}
                style={{ marginLeft: 8 }}>
                {yourPoints > 0 ? `+${yourPoints}` : '0'} {scoreText || 'stig'}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** Numeric score field. value may be null (= not yet tipped): the field shows
 *  a placeholder until typed, so a real 0 is distinguishable from "no pick".
 *  Accepts a single goal digit only, 0 to 9. */
export function ScoreInput({ value, onChange, disabled, ariaLabel }) {
  const shown = Number.isInteger(value) ? String(value) : '';
  const handle = (e) => {
    // Keep only digits, take the last one typed, and enforce the 0-9 range.
    const digits = e.target.value.replace(/\D/g, '');
    const last = digits.slice(-1);
    onChange(/^[0-9]$/.test(last) ? parseInt(last, 10) : null);
  };
  return (
    <input
      className={`score-in ${Number.isInteger(value) ? 'filled' : ''}`}
      type="text"
      inputMode="numeric"
      pattern="[0-9]"
      maxLength={1}
      value={shown}
      placeholder="–"
      disabled={disabled}
      onChange={handle}
      aria-label={ariaLabel}
    />
  );
}
