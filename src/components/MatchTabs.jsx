import { useState } from 'react';
import MatchPredictions from './MatchPredictions';
import MatchEvents from './MatchEvents';
import { hasMatchEvents } from './Disclosure';
import { matchEditable } from '../lib/tournament';
import { useTournamentCtx } from '../hooks/useData';

// A row of tabs beneath a match, in the style of livescore.com: each tab only
// appears when it has something to show, and the first available one opens by
// default. Tipping is offered up until picks lock (1 hour before kickoff);
// Dystarstøður (goals, cards) appears once a match is live or finished.
//
// Frásøgn (commentary), Hagtøl (stats) and Liðini (line-ups) are added in a
// later pass once their data is wired through from the ESPN summary.
export default function MatchTabs({ match, yourPick, yourPoints, scoreText }) {
  const { now } = useTournamentCtx();
  const [active, setActive] = useState(null);

  const tabs = [];
  if (matchEditable(match, now)) {
    tabs.push({ id: 'tipping', label: 'Tipping', render: () => <MatchPredictions match={match} compact /> });
  }
  if (hasMatchEvents(match)) {
    tabs.push({ id: 'events', label: 'Dystarstøður', render: () => <MatchEvents match={match} /> });
  }

  if (!tabs.length) return null;
  const activeTab = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <div className="match-tabs">
      <div className="match-tabstrip" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === activeTab.id}
            className={`match-tab ${t.id === activeTab.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="match-tabpanel" role="tabpanel">{activeTab.render()}</div>
    </div>
  );
}
