import { MatchRow } from './Match';
import MatchPredictions from './MatchPredictions';
import MatchEvents from './MatchEvents';
import Disclosure, { hasMatchEvents } from './Disclosure';

// A match row with two independent dropdowns beneath it: the match events
// (goals, cards) and everyone's tips. They open separately so stats and
// predictions never crowd each other. During the live window (1h before
// kickoff through full-time) the tips dropdown shows all participants.
export default function MatchCard({ match, yourPick, yourPoints, scoreText }) {
  return (
    <div className="match-card">
      <MatchRow match={match} yourPick={yourPick} yourPoints={yourPoints} scoreText={scoreText} />
      {hasMatchEvents(match) && (
        <Disclosure title="Hendingar">
          <MatchEvents match={match} />
        </Disclosure>
      )}
      <Disclosure title="Tippingar">
        <MatchPredictions match={match} compact />
      </Disclosure>
    </div>
  );
}
