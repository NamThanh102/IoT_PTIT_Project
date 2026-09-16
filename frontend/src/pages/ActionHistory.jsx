/**
 * pages/ActionHistory.jsx — Trang lịch sử tác động thiết bị (bảng + lọc 6 ô)
 *
 * Luồng dữ liệu:
 * - Lọc: Device, DeviceID, Action, Status, Time → applied (deps) + page.
 * - Nút sort (Giảm dần/Tăng dần) kết hợp được với bộ lọc; mặc định giảm dần theo time.
 * - usePolling(getDeviceHistory(...), pollInterval, deps, cacheKey):
 *   pollInterval = 0 khi đang lọc (không tự poll), 3000 khi không lọc;
 *   cacheKey = fingerprint(page + filter + sort) để cache riêng từng tổ hợp.
 * - Bảng 5 cột + StatusBadge màu theo trạng thái + Pagination + Reload.
 * Định danh thiết bị là `name` (LED_1/LED_2); bảng action không còn sensorID.
 */
import { useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDeviceHistory } from '../api/index.js';

const STATUS_OPTIONS = ['ALL', 'ON', 'OFF', 'LOADING', 'FAILED'];
const ACTION_OPTIONS = ['ALL', 'ON', 'OFF'];
const TIME_HINT =
  'e.g 2026-08-22 10:30:45';

export default function ActionHistory() {
  const [deviceFilter, setDeviceFilter] = useState('');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [timeInput, setTimeInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('desc');

  const [applied, setApplied] = useState({
    device: '',
    deviceID: '',
    action: 'ALL',
    time: '',
    status: 'ALL',
  });

  const filterActive = Boolean(
    applied.device ||
    applied.deviceID ||
    applied.action !== 'ALL' ||
    applied.time ||
    applied.status !== 'ALL'
  );
  const pollInterval = filterActive ? 0 : 3000;
  const cacheKey = `actionhistory:${page}:${JSON.stringify(applied)}:${sortOrder}`;

  const { data, error, loading, refetch } = usePolling(
    (signal) =>
      getDeviceHistory(
        {
          page,
          limit: 10,
          deviceId: applied.device || undefined,
          deviceID: applied.deviceID || undefined,
          action: applied.action !== 'ALL' ? applied.action : undefined,
          time: applied.time,
          status: applied.status,
          sort: sortOrder,
        },
        signal
      ),
    pollInterval,
    [page, applied, sortOrder, pollInterval],
    cacheKey
  );

  function toggleSort() {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  }

  function applyFilter(event) {
    event.preventDefault();
    setApplied({
      device: deviceFilter,
      deviceID: deviceIdInput.trim(),
      action: actionFilter,
      time: timeInput.trim(),
      status: statusFilter,
    });
    setPage(1);
  }

  function clearFilter() {
    setDeviceFilter('');
    setDeviceIdInput('');
    setActionFilter('ALL');
    setTimeInput('');
    setStatusFilter('ALL');
    setApplied({ device: '', deviceID: '', action: 'ALL', time: '', status: 'ALL' });
    setPage(1);
  }

  return (
    <div className="page">
      <section className="card">
        <form className="filter-grid-6" onSubmit={applyFilter}>
          <div className="filter-group">
            <label className="filter-label">DeviceID</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. s9ykm5rcgy"
              value={deviceIdInput}
              onChange={(e) => setDeviceIdInput(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Device</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. LED"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Action</label>
            <select
              className="filter-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Time Range</label>
            <input
              type="text"
              className="filter-input"
              placeholder={TIME_HINT}
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn-primary">
              Filter
            </button>
            <button type="button" className="btn-secondary" onClick={clearFilter}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="card table-card">
        <div className="card-header">
          <h3 className="card-title">Action History</h3>
          <div className="header-actions">
            <button
              className="btn-reload"
              onClick={toggleSort}
              title="Sort by time"
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
            <button className="btn-reload" onClick={refetch}>↻ Reload</button>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        {loading && !data && (
          <div className="loading-state">
            <span className="loading-spinner" />
            Loading action history...
          </div>
        )}
        {!error && data && data.data.length === 0 && (
          <p className="empty-text">No action history found</p>
        )}
        {!error && data && data.data.length > 0 && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>DeviceID</th>
                  <th>Device</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="sensor-code">{row.device_id}</span>
                    </td>
                    <td className="value-cell">{row.device_name}</td>
                    <td className="value-cell">{row.action}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span className="total-text">Total: {data.pagination.total_records} records</span>
              <Pagination
                pagination={data.pagination}
                onPageChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}