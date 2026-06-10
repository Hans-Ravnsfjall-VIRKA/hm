import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandLockup } from './Brand';
import { TodayIcon, FixturesIcon, PredictIcon, BoardIcon, RulesIcon, PersonIcon } from './icons';
import { useAuth } from '../auth/AuthContext';
import { useTournamentCtx } from '../hooks/useData';
import InstallPrompt from './InstallPrompt';

const TABS = [
  { to: '/today', label: 'Í dag', Icon: TodayIcon },
  { to: '/fixtures', label: 'Dystir', Icon: FixturesIcon },
  { to: '/predict', label: 'Tipping', Icon: PredictIcon },
  { to: '/leaderboard', label: 'Støða', Icon: BoardIcon },
  { to: '/rules', label: 'Reglur', Icon: RulesIcon },
];

export default function Shell() {
  const { user } = useAuth();
  const { leaderboard } = useTournamentCtx();
  const navigate = useNavigate();
  const me = leaderboard.find((r) => r.uid === user?.uid);

  return (
    <div className="shell">
      <header className="topbar">
        <BrandLockup />
        <button className="you-btn" onClick={() => navigate('/profile')} aria-label="Vangamynd">
          <div className="you-chip">
            <span className="pts">{me ? me.total : 0}</span>
            <span className="lbl">{me?.rank ? `#${me.rank} · stig` : 'stig'}</span>
          </div>
          <span className="you-avatar"><PersonIcon width={18} height={18} /></span>
        </button>
      </header>

      <main className="page fade-in">
        <InstallPrompt />
        <Outlet />
      </main>

      <div className="tabbar-wrap">
        <nav className="tabbar">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="tab-pill" />}
                  <Icon />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
