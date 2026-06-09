import { PlusIcon, MinusIcon } from './icons';
import { isConcreteTeam } from '../lib/tournament';

const dtf = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Country flag. Uses the synced flag URL; falls back to a mono monogram. */
export function Flag({ team }) {
  const code = team?.code;
  if (team?.flag) {
    return <img className="flag" src={team.flag} alt="" loading="lazy" />;
  }
  const mono = (code || team?.name || '??').slice(0, 3).toUpperCase();
  return <span className="flag mono-chip">{mono}</span>;
}

function TeamSide({ team, side }) {
  const concrete = isConcreteTeam(team);
  return (
    <div className={`side ${side}`}>
      {concrete ? <Flag team={team} /> : <span className="flag mono-chip">?</span>}
      <span className={`name ${concrete ? '' : 'tbd'}`}>
        {concrete ? team.name : (team?.name || 'TBD')}
      </span>
    </div>
  );
}

/** A read-only match row. Shows result if finished, live score if live,
 *  kickoff time otherwise. Optionally shows the viewer's own pick + points. */
export function MatchRow({ match, yourPick, yourPoints, scoreText, onClick }) {
  const { homeTeam, awayTeam, finished, live, result, elapsed } = match;

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
        <div className="elapsed">{elapsed ? `${elapsed}'` : 'LIVE'}</div>
      </div>
    );
  } else {
    center = (
      <div className="center">
        <div className="kick">{match.kickoff ? dtf.format(match.kickoff) : '—'}</div>
      </div>
    );
  }

  return (
    <div className={`match ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <TeamSide team={homeTeam} side="home" />
      {center}
      <TeamSide team={awayTeam} side="away" />
      {(yourPick || yourPoints != null) && (
        <div className="your-pick">
          <span className="label">Your pick</span>
          <span>
            {yourPick
              ? <span className="val mono">{yourPick.h}:{yourPick.a}</span>
              : <span className="muted">none</span>}
            {yourPoints != null && (
              <span className={`pts-badge ${yourPoints >= 6 ? 'exact' : yourPoints > 0 ? 'scored' : 'zero'}`}
                style={{ marginLeft: 8 }}>
                {yourPoints > 0 ? `+${yourPoints}` : '0'} {scoreText || 'pts'}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/** Plus/minus number stepper. value may be null (= not yet predicted): the
 *  field shows a dash until the player taps, so a real 0 is distinguishable
 *  from "no pick". From null: minus -> 0, plus -> 1. */
export function Stepper({ value, onChange, disabled, max = 19 }) {
  const isSet = Number.isInteger(value);
  const dec = () => onChange(isSet ? Math.max(0, value - 1) : 0);
  const inc = () => onChange(isSet ? Math.min(max, value + 1) : 1);
  return (
    <div className="stepper">
      <button disabled={disabled || (isSet && value <= 0)} onClick={dec} aria-label="minus">
        <MinusIcon width={18} height={18} />
      </button>
      <span className="val">{isSet ? value : '–'}</span>
      <button disabled={disabled || (isSet && value >= max)} onClick={inc} aria-label="plus">
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}
