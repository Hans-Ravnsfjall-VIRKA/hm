import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { MatchRow } from '../components/Match';
import MatchPredictions from '../components/MatchPredictions';
import MatchEvents from '../components/MatchEvents';
import Disclosure, { hasMatchEvents } from '../components/Disclosure';
import { BackIcon } from '../components/icons';
import { STAGE_BY_ID } from '../lib/tournament';
import { foDateTime } from '../lib/foDate';

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, loaded } = useTournamentCtx();

  if (!loaded) return <div className="spinner" />;

  const match = matches.find((m) => String(m.id) === String(id));
  if (!match) {
    return (
      <>
        <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Aftur</button>
        <div className="empty"><div className="big">Dystur ikki funnin</div></div>
      </>
    );
  }

  const stageMeta = STAGE_BY_ID[match.stageId];

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Aftur</button>

      <div className="page-head">
        <h1>{stageMeta?.label || 'Dystur'}</h1>
        <p>{match.group ? `${match.group} · ` : ''}{match.kickoff ? foDateTime(match.kickoff) : 'Óvist'}</p>
      </div>

      <div style={{ marginBottom: 14 }}>
        <MatchRow match={match} />
      </div>

      {hasMatchEvents(match) && (
        <Disclosure title="Hendingar" defaultOpen>
          <MatchEvents match={match} />
        </Disclosure>
      )}

      <Disclosure title="Tippingar" defaultOpen>
        <MatchPredictions match={match} compact />
      </Disclosure>
    </>
  );
}
