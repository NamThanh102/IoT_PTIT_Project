import { useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDeviceHistory } from '../api/index.js';

const STATUS_OPTIONS = ['ALL', 'ON', 'OFF', 'LOADING', 'FAILED'];
const ACTION_OPTIONS = ['ALL', 'ON', 'OFF'];
const DEVICE_OPTIONS = ['ALL', 'LED_01', 'LED_02'];
const TIME_HINT =
  'Flexible: 2026 | 2026-08 | 2026-08-22 | 2026-08-22 10 | 2026-08-22 10:30 | 2026-08-22 10:30:45';

export default function ActionHistory() {
  const [sensorIdInput, setSensorIdInput] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [timeInput, setTimeInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [applied, setApplied] = useState({
    sensorId: '',
    device: 'ALL',
    action: 'ALL',
    time: '',
    status: 'ALL',
  });

  const { data, error, loading, refetch } = usePolling(
    (signal) =>
      getDeviceHistory(
        {
          page,
          limit: 10,
          sensorId: applied.sensorId,
          deviceId: applied.device !== 'ALL' ? applied.device : undefined,
          action: applied.action !== 'ALL' ? applied.action : undefined,
          time: applied.time,
          status: applied.status,
        },
        signal
      ),
    3000,
    [page, applied],
    'actionhistory'
  );

  function applyFilter(event) {
    event.preventDefault();
    setApplied({
      sensorId: sensorIdInput.trim(),
      device: deviceFilter,
      action: actionFilter,
      time: timeInput.trim(),
      status: statusFilter,
    });
    setPage(1);
  }

  function clearFilter() {
    setSensorIdInput('');
    setDeviceFilter('ALL');
    setActionFilter('ALL');
    setTimeInput('');
    setStatusFilter('ALL');
    setApplied({ sensorId: '', device: 'ALL', action: 'ALL', time: '', status: 'ALL' });
    setPage(1);
  }

  return (
    <div className="page">
      <section className="card">
        <form className="filter-grid-6" onSubmit={applyFilter}>
          <div className="filter-group">
            <label className="filter-label">Sensor ID</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. 1, 2, 3..."
              value={sensorIdInput}
              onChange={(e) => setSensorIdInput(e.target.value)}
            />
          </div>
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

      <section className="card table-card">
        <div className="card-header">
          <h3 className="card-title">Action History</h3>
          <button className="btn-reload" onClick={refetch}>↻ Reload</button>
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
                  <th>SensorID</th>
                  <th>DeviceID</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="sensor-code">null</span>
                    </td>
                    <td>
                      <span className="sensor-code">{row.device_id}</span>
                    </td>
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
