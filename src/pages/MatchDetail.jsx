import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { MatchRow } from '../components/Match';
import { BackIcon } from '../components/icons';
import { scorePick, scoreLabel } from '../lib/scoring';
import { STAGE_BY_ID, timeUntil, matchEditable, matchEditDeadline } from '../lib/tournament';
import { foDateTime } from '../lib/foDate';

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { matches, predictionDocs, loaded, now } = useTournamentCtx();
  const { user } = useAuth();

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
  const result = match.finished && match.result ? match.result : null;

  // Reveal everyone's picks only once THIS match locks - 1 hour before its
  // kickoff - so nobody can copy others' tips while picks are still open.
  const revealed = match.live || match.finished || !matchEditable(match, now);

  const rows = predictionDocs
    .map((doc) => {
      const pick = doc.picks?.[match.id] || null;
      const pts = result && pick ? scorePick(pick, result) : null;
      return { uid: doc.uid, name: doc.displayName || 'Ókendur', pick, pts };
    })
    .filter((r) => revealed || r.uid === user?.uid)
    .sort((a, b) => {
      if (result) {
        const pa = a.pts ?? -1; const pb = b.pts ?? -1;
        if (pb !== pa) return pb - pa;
      }
      return a.name.localeCompare(b.name);
    });

  const revealIn = !revealed ? timeUntil(matchEditDeadline(match), now) : null;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Aftur</button>

      <div className="page-head">
        <h1>{stageMeta?.label || 'Dystur'}</h1>
        <p>{match.group ? `${match.group} · ` : ''}{match.kickoff ? foDateTime(match.kickoff) : 'Óvist'}</p>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <MatchRow match={match} />
      </div>

      <div className="section-label">
        Tippingar
        {!revealed && <span className="muted"> · fjaldar{revealIn ? ` (${revealIn})` : ''}</span>}
      </div>

      {!revealed && (
        <div className="lock-note" style={{ marginBottom: 12 }}>
          Tippingar hjá hinum verða sýndar 1 tíma áðrenn dysturin byrjar, so eingin kann skriva av.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty"><p>{revealed ? 'Ongar tippingar enn.' : 'Tú hevur ikki tippað hendan dystin enn.'}</p></div>
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <div key={r.uid}
              className={`predict-list-row clickable ${r.uid === user?.uid ? 'me' : ''}`}
              onClick={() => navigate(`/player/${r.uid}`)}>
              <span className="pl-name">
                {r.name}{r.uid === user?.uid && <span className="muted" style={{ fontWeight: 400 }}> · tú</span>}
              </span>
              <span className="pl-pick mono">
                {r.pick ? `${r.pick.h}:${r.pick.a}` : <span className="muted">eingin</span>}
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
