import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { BackIcon } from '../components/icons';
import { Flag } from '../components/Match';
import { scorePick } from '../lib/scoring';
import { STAGES, STAGE_BY_ID, isConcreteTeam, matchEditable } from '../lib/tournament';
import { foDateShort, foTime } from '../lib/foDate';

function MiniSide({ team, align }) {
  const concrete = isConcreteTeam(team);
  return (
    <span className={`mini-side ${align}`}>
      {align === 'home' && <span className="mini-name">{concrete ? team.name : 'TBD'}</span>}
      {concrete ? <Flag team={team} /> : <span className="flag mono-chip">?</span>}
      {align === 'away' && <span className="mini-name">{concrete ? team.name : 'TBD'}</span>}
    </span>
  );
}

export default function Player() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { matches, predictionDocs, leaderboard, loaded, now } = useTournamentCtx();
  const { user } = useAuth();

  const doc = predictionDocs.find((d) => d.uid === uid);
  const lbRow = leaderboard.find((r) => r.uid === uid);

  const grouped = useMemo(() => {
    if (!doc) return [];
    const picks = doc.picks || {};
    const byStage = {};
    for (const m of matches) {
      const pick = picks[m.id];
      if (!pick && !m.finished) continue;
      (byStage[m.stageId] ||= []).push({ match: m, pick });
    }
    return STAGES
      .filter((s) => byStage[s.id]?.length)
      .map((s) => ({
        stage: s,
        items: byStage[s.id].sort((a, b) => (a.match.kickoff || 0) - (b.match.kickoff || 0)),
      }));
  }, [doc, matches]);

  if (!loaded) return <div className="spinner" />;

  if (!doc) {
    return (
      <>
        <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Aftur</button>
        <div className="empty"><div className="big">Spælari ikki funnin</div></div>
      </>
    );
  }

  const isMe = uid === user?.uid;

  return (
    <>
      <button className="back" onClick={() => navigate(-1)}><BackIcon width={20} height={20} /> Aftur</button>

      <div className="page-head">
        <h1>{doc.displayName || 'Spælari'}{isMe && <span className="muted" style={{ fontWeight: 400 }}> · tú</span>}</h1>
        <p>{lbRow ? `Pláss ${lbRow.rank} · ${lbRow.total} stig · ${lbRow.exact} neyvt` : 'Eingin stig enn'}</p>
      </div>

      {grouped.length === 0 ? (
        <div className="empty"><p>Ongar tippingar enn.</p></div>
      ) : grouped.map(({ stage, items }) => (
        <section key={stage.id} className="player-stage">
          <div className="section-label">{STAGE_BY_ID[stage.id]?.label || stage.label}</div>
          <div className="stack">
            {items.map(({ match, pick }) => {
              const result = match.finished && match.result ? match.result : null;
              const pts = result && pick ? scorePick(pick, result) : null;
              // Hide another player's pick until this match locks (1h before
              // kickoff), so profiles can't be used to copy open tips.
              const canSee = isMe || match.live || match.finished || !matchEditable(match, now);
              return (
                <div key={match.id} className="player-row clickable" onClick={() => navigate(`/match/${match.id}`)}>
                  <div className="pr-teams">
                    <MiniSide team={match.homeTeam} align="home" />
                    <span className="pr-vs mono">
                      {result ? `${result.h}:${result.a}` : (match.kickoff ? foTime(match.kickoff) : 'Óvist')}
                    </span>
                    <MiniSide team={match.awayTeam} align="away" />
                  </div>
                  <div className="pr-pick">
                    <span className="mono">
                      {!canSee ? <span className="muted" title="Fjalt til 1 tíma áðrenn dystur">Fjalt</span>
                        : pick ? `${pick.h}:${pick.a}` : <span className="muted">—</span>}
                    </span>
                    {pts != null && (
                      <span className={`pts-badge ${pts >= 6 ? 'exact' : pts > 0 ? 'scored' : 'zero'}`}>
                        {pts > 0 ? `+${pts}` : '0'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
