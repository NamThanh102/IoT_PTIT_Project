import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-main">
        <Header pathname={pathname} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
