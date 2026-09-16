/**
 * pages/DataSensor.jsx — Trang xem dữ liệu cảm biến dạng bảng (phân trang + lọc)
 *
 * Luồng dữ liệu:
 * - Form lọc 4 ô (SensorID, Name, Value, Time) → appliedFilters + page.
 * - Nút sort (Giảm dần/Tăng dần) kết hợp được với bộ lọc; mặc định giảm dần theo time.
 * - usePolling(getDataAll(...), pollInterval, deps, cacheKey):
 *   pollInterval = 0 khi đang lọc (không tự poll, chỉ fetch khi đổi page/sort/Reload),
 *   3000 khi không lọc; cacheKey = fingerprint(page + filter + sort) để cache riêng từng tổ hợp.
 * - Bảng 4 cột (SensorID, loại + màu, giá trị + đơn vị, thời gian) + Pagination + nút Reload.
 * - UNIT_MAP/TYPE_COLOR: quy ước đơn vị và màu theo tên cảm biến (Temperature/Humidity/Light).
 *   `name` là định danh cảm biến (không còn code/sensor_uid).
 */
import { useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDataAll } from '../api/index.js';

const TIME_HINT =
  'e.g 2026-08-22 10:30:45';

const UNIT_MAP = { Temperature: '°C', Humidity: '%', Light: 'lux' };
const TYPE_COLOR = { Temperature: '#b91c1c', Humidity: '#0369a1', Light: '#a16207' };

export default function DataSensor() {
  const [sensorIdInput, setSensorIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    sensorId: '',
    name: '',
    value: '',
    time: '',
  });
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('desc');

  const filterActive = Boolean(
    appliedFilters.sensorId || appliedFilters.name || appliedFilters.value || appliedFilters.time
  );
  const pollInterval = filterActive ? 0 : 3000;
  const cacheKey = `datasensor:${page}:${JSON.stringify(appliedFilters)}:${sortOrder}`;

  const { data, error, loading, refetch } = usePolling(
    (signal) =>
      getDataAll(
        {
          page,
          limit: 10,
          sensorId: appliedFilters.sensorId,
          name: appliedFilters.name,
          value: appliedFilters.value,
          time: appliedFilters.time,
          sort: sortOrder,
        },
        signal
      ),
    pollInterval,
    [page, appliedFilters, sortOrder, pollInterval],
    cacheKey
  );

  function toggleSort() {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  }

  function applyFilter(event) {
    event.preventDefault();
    setAppliedFilters({
      sensorId: sensorIdInput.trim(),
      name: nameInput,
      value: valueInput.trim(),
      time: timeInput.trim(),
    });
    setPage(1);
  }

  function clearFilter() {
    setSensorIdInput('');
    setNameInput('');
    setValueInput('');
    setTimeInput('');
    setAppliedFilters({ sensorId: '', name: '', value: '', time: '' });
    setPage(1);
  }

  return (
    <div className="page">
      <section className="card">
        <form className="filter-grid" onSubmit={applyFilter}>
          <div className="filter-group">
            <label className="filter-label">SensorID</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. qvaq0snp5m"
              value={sensorIdInput}
              onChange={(event) => setSensorIdInput(event.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Sensor</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. Temperature"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Value</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. 30.5"
              value={valueInput}
              onChange={(event) => setValueInput(event.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Time Range</label>
            <input
              type="text"
              className="filter-input"
              placeholder={TIME_HINT}
              value={timeInput}
              onChange={(event) => setTimeInput(event.target.value)}
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
          <h3 className="card-title">Sensor Data</h3>
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
            Loading sensor data...
          </div>
        )}
        {!error && data && data.data.length === 0 && !loading && (
          <p className="empty-text">No matching records found</p>
        )}
        {!error && data && data.data.length > 0 && (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SensorID</th>
                  <th>Sensor</th>
                  <th>Value</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="sensor-code">{row.sensorID}</span>
                    </td>
                    <td style={{ color: TYPE_COLOR[row.name], fontWeight: 600 }}>
                      {row.name}
                    </td>
                    <td className="value-cell">
                      {row.value}
                      <span className="value-unit">{UNIT_MAP[row.name] || ''}</span>
                    </td>
                    <td>{row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-footer">
              <span className="total-text">
                Total: {data.pagination.total_records} records
              </span>
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