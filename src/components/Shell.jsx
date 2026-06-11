import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const me = leaderboard.find((r) => r.uid === user?.uid);
  const activeIdx = TABS.findIndex(
    (t) => location.pathname === t.to || location.pathname.startsWith(`${t.to}/`));

  return (
    <div className="shell">
      <header className="topbar">
        <BrandLockup />
        <button className="you-btn" onClick={() => navigate('/profile')} aria-label="Vangamynd">
          <div className="you-chip">
            {me?.rank ? <span className="lbl">#{me.rank} ·</span> : null}
            <span className="pts">{me ? me.total : 0}</span>
            <span className="lbl">stig</span>
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
          <span className="tab-slider" aria-hidden="true"
            style={{ '--n': TABS.length, '--i': activeIdx, opacity: activeIdx < 0 ? 0 : 1 }} />
          {TABS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
