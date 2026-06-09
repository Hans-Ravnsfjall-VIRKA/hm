import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { MatchRow } from '../components/Match';
import { BackIcon } from '../components/icons';
import { scorePick, scoreLabel } from '../lib/scoring';
import { STAGE_BY_ID, timeUntil } from '../lib/tournament';

const dayf = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, predictionDocs, stages, loaded, now } = useTournamentCtx();
  const { user } = useAuth();

  if (!loaded) return <div className="spinner" />;

  const match = matches.find((m) => String(m.id) === String(id));
  if (!match) {
    return (
      <>
        <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Back</button>
        <div className="empty"><div className="big">Match not found</div></div>
      </>
    );
  }

  const stage = stages.find((s) => s.id === match.stageId);
  const stageMeta = STAGE_BY_ID[match.stageId];
  const result = match.finished && match.result ? match.result : null;

  // Only reveal everyone's picks once the stage is locked. Before lock,
  // predictions are still open, so showing them would spoil the contest.
  const revealed = !stage || stage.locked || match.live || match.finished;

  const rows = predictionDocs
    .map((doc) => {
      const pick = doc.picks?.[match.id] || null;
      const pts = result && pick ? scorePick(pick, result) : null;
      return { uid: doc.uid, name: doc.displayName || 'Unknown', pick, pts };
    })
    .filter((r) => revealed || r.uid === user?.uid)
    .sort((a, b) => {
      if (result) {
        const pa = a.pts ?? -1, pb = b.pts ?? -1;
        if (pb !== pa) return pb - pa;
      }
      return a.name.localeCompare(b.name);
    });

  const lock = stage && !stage.locked ? timeUntil(stage.lockAt, now) : null;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Back</button>

      <div className="page-head">
        <h1>{stageMeta?.label || 'Match'}</h1>
        <p>{match.group ? `${match.group} · ` : ''}{match.kickoff ? dayf.format(match.kickoff) : 'TBD'}</p>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <MatchRow match={match} />
      </div>

      <div className="section-label">
        Predictions
        {!revealed && <span className="muted"> · hidden until picks lock{lock ? ` (${lock})` : ''}</span>}
      </div>

      {rows.length === 0 ? (
        <div className="empty"><p>No predictions yet.</p></div>
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <div key={r.uid}
              className={`predict-list-row clickable ${r.uid === user?.uid ? 'me' : ''}`}
              onClick={() => navigate(`/player/${r.uid}`)}>
              <span className="pl-name">
                {r.name}{r.uid === user?.uid && <span className="muted" style={{ fontWeight: 400 }}> · you</span>}
              </span>
              <span className="pl-pick mono">
                {r.pick ? `${r.pick.h}:${r.pick.a}` : <span className="muted">no pick</span>}
              </span>
              {result ? (
                <span className={`pts-badge ${r.pts >= 6 ? 'exact' : r.pts > 0 ? 'scored' : 'zero'}`}
                  title={scoreLabel(r.pts, r.pick, result) || ''}>
                  {r.pts > 0 ? `+${r.pts}` : '0'}
                </span>
              ) : <span className="pl-spacer" />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
