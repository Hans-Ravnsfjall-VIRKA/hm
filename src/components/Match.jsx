import { isConcreteTeam } from '../lib/tournament';
import { foTime } from '../lib/foDate';

/** Country flag. Uses the synced flag URL; falls back to a mono monogram. */
export function Flag({ team }) {
  const code = team?.code;
  if (team?.flag) {
    return <img className="flag" src={team.flag} alt="" loading="lazy" />;
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
  const { homeTeam, awayTeam, finished, live, result, elapsed, clock } = match;

  const reds = (live || finished) && Array.isArray(match.events)
    ? match.events.filter((e) => e.t === 'red') : [];
  const redHome = reds.filter((e) => e.side === 'home').length;
  const redAway = reds.filter((e) => e.side === 'away').length;

  let center;
  if (finished && result) {
    center = (
      <div className="center">
        <div className="score"><span>{result.h}</span><span className="sep">:</span><span>{result.a}</span></div>
        <div className="kick">FT</div>
      </div>
    );
  } else if (live && result) {
    center = (
      <div className="center">
        <div className="score live-score"><span>{result.h}</span><span className="sep">:</span><span>{result.a}</span></div>
        <div className="elapsed">{clock || (elapsed ? `${elapsed}'` : 'LIVE')}</div>
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
          <span className="label">Tipping</span>
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
