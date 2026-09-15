import { NavLink } from 'react-router-dom';
import { DashboardIcon, SensorIcon, HistoryIcon, UserIcon } from './Icons.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/datasensor', label: 'DataSensor', icon: SensorIcon },
  { to: '/actionhistory', label: 'Action History', icon: HistoryIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">IoT</div>
        <div>
          <div className="sidebar-brand-title">Smart Room</div>
          <div className="sidebar-brand-subtitle">Monitoring System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon">
              <item.icon />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">PTIT - B23DCCN587</div>
    </aside>
  );
}
