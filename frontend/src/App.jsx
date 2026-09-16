/**
 * App.jsx — Định tuyến (routing) toàn ứng dụng
 *
 * - 4 trang lazy-load từng chunk riêng; pageLoader cache promise
 *   → đổi tab không tải lại bundle.
 * - Mọi route nằm trong <Layout> (Sidebar + Header) qua <Outlet/>;
 *   path không khớp → redirect về /dashboard.
 *
 * Route: /dashboard, /datasensor, /actionhistory, /profile.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';

const pageLoader = {
  Dashboard: import('./pages/Dashboard.jsx'),
  DataSensor: import('./pages/DataSensor.jsx'),
  ActionHistory: import('./pages/ActionHistory.jsx'),
  Profile: import('./pages/Profile.jsx'),
};

const Dashboard = lazy(() => pageLoader.Dashboard);
const DataSensor = lazy(() => pageLoader.DataSensor);
const ActionHistory = lazy(() => pageLoader.ActionHistory);
const Profile = lazy(() => pageLoader.Profile);

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="layout">
          <div className="page-loading">Loading...</div>
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/datasensor" element={<DataSensor />} />
          <Route path="/actionhistory" element={<ActionHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}