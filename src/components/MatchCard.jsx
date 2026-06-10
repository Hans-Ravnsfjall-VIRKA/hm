import { useState } from 'react';
import { MatchRow } from './Match';
import MatchPredictions from './MatchPredictions';
import MatchEvents from './MatchEvents';
import { ChevronIcon } from './icons';

// A match row that expands in place to reveal everyone's predictions. Tapping
// the row or the toggle opens it. During the live window (from 1h before
// kickoff through full-time) the panel shows all participants' tips.
export default function MatchCard({ match, yourPick, yourPoints, scoreText }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="match-card">
      <MatchRow match={match} yourPick={yourPick} yourPoints={yourPoints} scoreText={scoreText}
        onClick={() => setOpen((o) => !o)} />
      <button className={`pred-toggle ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Fjal tippingar' : 'Sí tippingar'} <ChevronIcon />
      </button>
      {open && <div className="pred-panel"><MatchEvents match={match} /><MatchPredictions match={match} compact /></div>}
    </div>
  );
}
