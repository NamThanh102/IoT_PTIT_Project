import { useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDeviceHistory } from '../api/index.js';

const STATUS_OPTIONS = ['ALL', 'ON', 'OFF', 'LOADING', 'FAILED'];
const ACTION_OPTIONS = ['ALL', 'ON', 'OFF'];
const DEVICE_OPTIONS = ['ALL', 'LED_1', 'LED_2'];
const TIME_HINT =
  'e.g 2026-08-22 10:30:45';

export default function ActionHistory() {
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeInput, setTimeInput] = useState('');
  const [limit, setLimit] = useState(10);
  const [limitInput, setLimitInput] = useState('10');
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('desc');

  const [applied, setApplied] = useState({
    device: 'ALL',
    action: 'ALL',
    time: '',
    status: 'ALL',
  });

  const filterActive = Boolean(
    applied.device !== 'ALL' ||
    applied.action !== 'ALL' ||
    applied.time ||
    applied.status !== 'ALL'
  );
  const pollInterval = filterActive ? 0 : 3000;
  const cacheKey = `actionhistory:${page}:${limit}:${JSON.stringify(applied)}:${sortOrder}`;

  const { data, error, loading, refetch } = usePolling(
    (signal) =>
      getDeviceHistory(
        {
          page,
          limit,
          deviceId: applied.device !== 'ALL' ? applied.device : undefined,
          action: applied.action !== 'ALL' ? applied.action : undefined,
          time: applied.time,
          status: applied.status,
          sort: sortOrder,
        },
        signal
      ),
    pollInterval,
    [page, limit, applied, sortOrder, pollInterval],
    cacheKey
  );

  // Đảo ngược thứ tự sắp xếp theo thời gian (Giảm dần <-> Tăng dần) và quay về trang 1.
  function toggleSort() {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  }

  // Áp dụng các tiêu chí lọc được chọn vào bảng dữ liệu và quay về trang 1.
  function applyFilter(event) {
    event.preventDefault();
    setApplied({
      device: deviceFilter,
      action: actionFilter,
      time: timeInput.trim(),
      status: statusFilter,
    });
    setPage(1);
  }

  // Cập nhật số dòng hiển thị tối đa trên một trang và quay về trang 1.
  function changeLimit(nextLimit) {
    setLimit(nextLimit);
    setPage(1);
  }

  // Xác nhận lại ô input số dòng mỗi trang để áp dụng.
  function commitLimit() {
    const n = Math.floor(Number(limitInput));
    if (Number.isFinite(n) && n >= 1) {
      changeLimit(n);
      setLimitInput(String(n));
    } else {
      setLimitInput(String(limit));
    }
  }

  // Đặt lại toàn bộ các bộ lọc về giá trị mặc định ('ALL') và xóa input tìm kiếm thời gian.
  function clearFilter() {
    setDeviceFilter('ALL');
    setActionFilter('ALL');
    setTimeInput('');
    setStatusFilter('ALL');
    setApplied({ device: 'ALL', action: 'ALL', time: '', status: 'ALL' });
    setPage(1);
  }

  return (
    <div className="page">
      
      {/* Bộ lọc lịch sử thiết bị */}
      <section className="card">
        <form className="filter-grid-6" onSubmit={applyFilter}>
          <div className="filter-group">
            <label className="filter-label">Device</label>
            <select
              className="filter-select"
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
            >
              {DEVICE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
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

      {/* Bảng lịch sử thao tác thiết bị */}
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
                  <th>User</th>
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
                    <td className="value-cell">{row.userID}</td>
                    <td className="value-cell">{row.action}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phân trang và số dòng/trang */}
            <div className="table-footer">
              <span className="total-text">Total: {data.pagination.total_records} records</span>
              <div className="rows-page">
                <label className="rows-page-label" htmlFor="rows-per-page">Rows/page</label>
                <input
                  id="rows-per-page"
                  type="text"
                  className="rows-page-input"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  onBlur={commitLimit}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitLimit(); } }}
                />
              </div>
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