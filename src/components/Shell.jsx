import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BrandLockup } from './Brand';
import { TodayIcon, FixturesIcon, PredictIcon, BoardIcon, RulesIcon, LogoutIcon } from './icons';
import { useAuth } from '../auth/AuthContext';
import { useTournamentCtx } from '../hooks/useData';

const TABS = [
  { to: '/today', label: 'Í dag', Icon: TodayIcon },
  { to: '/fixtures', label: 'Dystir', Icon: FixturesIcon },
  { to: '/predict', label: 'Tipping', Icon: PredictIcon },
  { to: '/leaderboard', label: 'Støða', Icon: BoardIcon },
  { to: '/rules', label: 'Reglur', Icon: RulesIcon },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const { leaderboard } = useTournamentCtx();
  const navigate = useNavigate();
  const me = leaderboard.find((r) => r.uid === user?.uid);

  return (
    <div className="shell">
      <header className="topbar">
        <BrandLockup />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="you-chip">
            <span className="pts">{me ? me.total : 0}</span>
            <span className="lbl">{me?.rank ? `#${me.rank} · stig` : 'stig'}</span>
          </div>
          <button className="btn btn-ghost" style={{ padding: 9, borderRadius: 12 }}
            onClick={() => logout().then(() => navigate('/'))} aria-label="Far út">
            <LogoutIcon width={20} height={20} />
          </button>
        </div>
      </header>

      <main className="page fade-in">
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
