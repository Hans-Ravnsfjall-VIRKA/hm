import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { TournamentProvider } from './hooks/useData';
import Shell from './components/Shell';
import Auth from './pages/Auth';
import Today from './pages/Today';
import Fixtures from './pages/Fixtures';
import Predict from './pages/Predict';
import Leaderboard from './pages/Leaderboard';
import MatchDetail from './pages/MatchDetail';
import Player from './pages/Player';

function Gate() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="boot">
        <div className="spinner" />
      </div>
    );
  }

  // Signed out: the auth screen. It lives inside the router so it can navigate.
  if (!user) return <Auth />;

  // Signed in: one shared tournament subscription wraps the whole app.
  return (
    <TournamentProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/player/:uid" element={<Player />} />
          <Route path="*" element={<Navigate to="/today" replace />} />
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
