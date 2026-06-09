import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentCtx } from '../hooks/useData';
import { useAuth } from '../auth/AuthContext';
import { MatchRow } from '../components/Match';
import { scorePick } from '../lib/scoring';

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function Fixtures() {
  const { stages, standings, predictionDocs, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const navigate = useNavigate();
  const myPicks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);

  const available = stages.filter((s) => s.count > 0);
  const [stageId, setStageId] = useState('group');
  const [view, setView] = useState('matches');
  const stage = available.find((s) => s.id === stageId) || available[0];

  if (!loaded) return <div className="spinner" />;
  if (!available.length) {
    return (
      <>
        <div className="page-head"><h1>Fixtures</h1></div>
        <div className="empty"><div className="big">No fixtures yet</div>
          <p>Match data appears here as soon as the first sync runs.</p></div>
      </>
    );
  }

  // Group this stage's matches by local day.
  const byDay = {};
  for (const m of stage.matches) {
    const key = m.kickoff ? dayFmt.format(m.kickoff) : 'TBD';
    (byDay[key] ||= []).push(m);
  }

  return (
    <>
      <div className="page-head"><h1>Fixtures</h1></div>

      <div className="seg" style={{ overflowX: 'auto' }}>
        {available.map((s) => (
          <button key={s.id} className={s.id === stage.id ? 'active' : ''}
            onClick={() => { setStageId(s.id); setView('matches'); }} style={{ flex: '0 0 auto', padding: '8px 14px' }}>
            {s.short}
          </button>
        ))}
      </div>

      {stage.id === 'group' && standings.length > 0 && (
        <div className="seg">
          <button className={view === 'matches' ? 'active' : ''} onClick={() => setView('matches')}>Matches</button>
          <button className={view === 'standings' ? 'active' : ''} onClick={() => setView('standings')}>Standings</button>
        </div>
      )}

      {view === 'standings'
        ? <Standings groups={standings} />
        : Object.entries(byDay).map(([day, ms]) => (
            <div key={day}>
              <div className="day-label">{day}</div>
              <div className="stack">
                {ms.map((m) => {
                  const pick = myPicks[m.id];
                  const pts = m.finished && pick && m.result ? scorePick(pick, m.result) : null;
                  return <MatchRow key={m.id} match={m} yourPick={pick} yourPoints={pts}
                    onClick={() => navigate(`/match/${m.id}`)} />;
                })}
              </div>
            </div>
          ))}
    </>
  );
}

function Standings({ groups }) {
  return (
    <div className="stack">
      {groups.map((g) => (
        <div className="panel" key={g.name}>
          <div className="day-label" style={{ marginTop: 0 }}>{g.name}</div>
          <table className="standings-table">
            <thead>
              <tr><th></th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
            </thead>
            <tbody>
              {g.table.map((r, i) => (
                <tr key={r.team.name} className={i < 2 ? 'qual' : ''}>
                  <td className="mono">{i + 1}</td>
                  <td>{r.team.name}</td>
                  <td className="mono">{r.P}</td><td className="mono">{r.W}</td>
                  <td className="mono">{r.D}</td><td className="mono">{r.L}</td>
                  <td className="mono">{r.GD > 0 ? `+${r.GD}` : r.GD}</td>
                  <td className="pts">{r.Pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
