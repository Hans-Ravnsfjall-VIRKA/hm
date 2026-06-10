import { useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { scorePick, scoreLabel } from '../lib/scoring';
import { matchEditable, matchEditDeadline, timeUntil } from '../lib/tournament';

// All participants' picks for one match. Others' picks stay hidden until the
// match locks (1 hour before kickoff) so nobody can copy while picks are open;
// from then through full-time everyone's tips are shown. Used both inline (via
// the expandable match card) and on the full match page.
export default function MatchPredictions({ match, compact = false }) {
  const navigate = useNavigate();
  const { predictionDocs, now } = useTournamentCtx();
  const { user } = useAuth();

  const result = match.finished && match.result ? match.result : null;
  const revealed = match.live || match.finished || !matchEditable(match, now);
  const revealIn = !revealed ? timeUntil(matchEditDeadline(match), now) : null;

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

  return (
    <>
      {!compact && (
        <div className="section-label">
          Tippingar
          {!revealed && <span className="muted"> · fjaldar{revealIn ? ` (${revealIn})` : ''}</span>}
        </div>
      )}

      {!revealed && (
        <div className="lock-note" style={{ marginBottom: 12 }}>
          Tippingar hjá øllum verða vístar 1 tíma áðrenn dysturin byrjar
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
