/**
 * Layout.jsx — Khung bố cục chung của app (mọi trang dùng chung)
 *
 * - getProfile() 1 lần lúc mount → truyền name/msv vào Header + Sidebar
 *   (fallback giữ giá trị mặc định khi API chưa trả / lỗi).
 */
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import { getProfile } from '../api/index.js';

const FALLBACK_USER = { name: 'Nguyễn Thành Nam', msv: 'B23DCCN587' };

export default function Layout() {
  const { pathname } = useLocation();
  const [user, setUser] = useState(FALLBACK_USER);

  useEffect(() => {
    let cancelled = false;
    getProfile()
      .then((body) => {
        if (cancelled || !body?.data) return;
        setUser({
          name: body.data.name || FALLBACK_USER.name,
          msv: body.data.msv || FALLBACK_USER.msv,
        });
      })
      .catch(() => {
        // giữ fallback, không cần báo lỗi khối layout
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="layout">
      <Sidebar msv={user.msv} />
      <div className="layout-main">
        <Header pathname={pathname} name={user.name} msv={user.msv} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
