const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/datasensor': 'DataSensor',
  '/actionhistory': 'Action History',
  '/profile': 'Profile',
};

export default function Header({ pathname }) {
  return (
    <header className="header">
      <h1 className="header-title">{PAGE_TITLES[pathname] || 'IoT System'}</h1>
      <div className="header-right">
        <div className="header-user">
          <div className="header-user-name">Nguyễn Thành Nam</div>
          <div className="header-user-id">B23DCCN587</div>
        </div>
        <div className="header-avatar">NTN</div>
      </div>
    </header>
  );
}
