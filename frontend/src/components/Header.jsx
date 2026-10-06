/**
 * Header.jsx — Thanh tiêu đề trên cùng
 */
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/datasensor': 'DataSensor',
  '/actionhistory': 'Action History',
  '/profile': 'Profile',
};

export default function Header({ pathname, name = 'Nguyễn Thành Nam', msv = 'B23DCCN587' }) {
  return (
    <header className="header">
      <h1 className="header-title">{PAGE_TITLES[pathname] || 'IoT System'}</h1>
      <div className="header-right">
        <div className="header-user">
          <div className="header-user-name">{name}</div>
          <div className="header-user-id">{msv}</div>
        </div>
        <div className="header-avatar">NTN</div>
      </div>
    </header>
  );
}
