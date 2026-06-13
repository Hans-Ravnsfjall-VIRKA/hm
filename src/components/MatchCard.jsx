import { MatchRow } from './Match';
import MatchTabs from './MatchTabs';

// A match row with a Livescore-style tab strip beneath it. Tabs appear only
// when they have content: Tipping (until picks lock 1h before kickoff) and
// Dystarstøður (goals + cards, once live or finished). More tabs (Frásøgn,
// Hagtøl, Liðini) are added as their data is wired in.
export default function MatchCard({ match, yourPick, yourPoints, scoreText }) {
  return (
    <div className="match-card">
      <MatchRow match={match} yourPick={yourPick} yourPoints={yourPoints} scoreText={scoreText} />
      <MatchTabs match={match} yourPick={yourPick} yourPoints={yourPoints} scoreText={scoreText} />
    </div>
  );
}
