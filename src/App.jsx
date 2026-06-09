import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { TournamentProvider, useTournamentCtx } from './hooks/useData';
import { stageComplete } from './lib/tournament';
import Shell from './components/Shell';
import Auth from './pages/Auth';
import Today from './pages/Today';
import Fixtures from './pages/Fixtures';
import Predict from './pages/Predict';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import MatchDetail from './pages/MatchDetail';
import Player from './pages/Player';

// Where to land: if a stage is open for tipping and the player hasn't filled
// it in, take them to Tipping. Otherwise show Í dag.
function Landing() {
  const { stages, predictionDocs, loaded } = useTournamentCtx();
  const { user } = useAuth();
  const picks = useMemo(
    () => predictionDocs.find((d) => d.uid === user?.uid)?.picks || {}, [predictionDocs, user]);
  if (!loaded) return <div className="spinner" />;
  const needsTipping = stages.some((s) => s.open && !stageComplete(s, picks));
  return <Navigate to={needsTipping ? '/predict' : '/today'} replace />;
}

function Gate() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="boot"><div className="spinner" /></div>;
  }
  if (!user) return <Auth />;

  return (
    <TournamentProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Landing />} />
          <Route path="/today" element={<Today />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/player/:uid" element={<Player />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </TournamentProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AuthProvider>
  );
}
