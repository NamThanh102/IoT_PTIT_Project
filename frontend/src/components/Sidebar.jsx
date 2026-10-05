/**
 * Sidebar.jsx — Menu điều hướng trái
 *
 * - NAV_ITEMS: danh sách 4 trang (Dashboard, DataSensor, Action History, Profile).
 * - NavLink tự đánh dấu .active theo đường dẫn hiện tại.
 * - Đầu sidebar là brand "IoT System", cuối là chân trang MSSV (prop msv từ /api/profile).
 */
import { NavLink } from 'react-router-dom';
import { DashboardIcon, SensorIcon, HistoryIcon, UserIcon } from './Icons.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/datasensor', label: 'DataSensor', icon: SensorIcon },
  { to: '/actionhistory', label: 'Action History', icon: HistoryIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

export default function Sidebar({ msv = 'B23DCCN587' }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">IoT</div>
        <div>
          <div className="sidebar-brand-title">IoT System</div>
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

      <div className="sidebar-footer">PTIT - {msv}</div>
    </aside>
  );
}
