import { useState } from 'react';
import MatchPredictions from './MatchPredictions';
import MatchEvents from './MatchEvents';
import MatchStats from './MatchStats';
import MatchLineups from './MatchLineups';
import MatchCommentary from './MatchCommentary';
import { hasMatchEvents } from './Disclosure';
import { matchEditable } from '../lib/tournament';
import { useTournamentCtx, useMatchDetail } from '../hooks/useData';

// Livescore-style tab strip beneath a match. Tabs appear only when they have
// something to show and all available ones sit side-by-side. Nothing is open
// by default; tapping a tab opens it and tapping it again collapses it.
//
// Tipping + Dystarstøður run on data already loaded with the match. Frásøgn,
// Liðini and Hagtøl live in a separate details/{id} doc that loads only while
// one of those tabs is open.
const DETAIL_TABS = new Set(['commentary', 'lineups', 'stats']);

function Loading({ loading }) {
  return <div className="empty"><p>{loading ? 'Innlesur…' : 'Eingin dáta enn.'}</p></div>;
}

export default function MatchTabs({ match }) {
  const { now } = useTournamentCtx();
  const [active, setActive] = useState(null);

  const tabs = [];
  if (matchEditable(match, now)) tabs.push({ id: 'tipping', label: 'Tipping' });
  if (hasMatchEvents(match)) tabs.push({ id: 'events', label: 'Dystarstøður' });
  if (match.feat?.commentary) tabs.push({ id: 'commentary', label: 'Frásøgn' });
  if (match.feat?.lineups) tabs.push({ id: 'lineups', label: 'Liðini' });
  if (match.feat?.stats) tabs.push({ id: 'stats', label: 'Hagtøl' });

  const activeTab = active ? tabs.find((t) => t.id === active) : null;
  const needDetail = !!activeTab && DETAIL_TABS.has(activeTab.id);
  const { detail, loading } = useMatchDetail(match.id, needDetail);

  if (!tabs.length) return null;

  function panel() {
    if (!activeTab) return null;
    switch (activeTab.id) {
      case 'tipping': return <MatchPredictions match={match} compact />;
      case 'events': return <MatchEvents match={match} />;
      case 'commentary': return detail ? <MatchCommentary commentary={detail.commentary} /> : <Loading loading={loading} />;
      case 'lineups': return detail ? <MatchLineups lineups={detail.lineups} match={match} /> : <Loading loading={loading} />;
      case 'stats': return detail ? <MatchStats stats={detail.stats} /> : <Loading loading={loading} />;
      default: return null;
    }
  }

  return (
    <div className="match-tabs">
      <div className="match-tabstrip" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab?.id === t.id}
            className={`match-tab ${activeTab?.id === t.id ? 'active' : ''}`}
            onClick={() => setActive((cur) => (cur === t.id ? null : t.id))}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab && <div className="match-tabpanel" role="tabpanel">{panel()}</div>}
    </div>
  );
}
