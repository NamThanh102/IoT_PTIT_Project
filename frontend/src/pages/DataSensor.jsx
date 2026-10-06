import { useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDataAll } from '../api/index.js';

const FIELD_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SensorID', label: 'SensorID' },
  { value: 'Temperature', label: 'Temp' },
  { value: 'Humidity', label: 'Humi' },
  { value: 'Light', label: 'Light' },
  { value: 'Time', label: 'Time' },
];

const TIME_HINT =
  'e.g 2026-09-23 14:36:00';

const UNIT_MAP = { Temperature: '°C', Humidity: '%', Light: 'lux' };
const TYPE_COLOR = { Temperature: '#b91c1c', Humidity: '#0369a1', Light: '#a16207' };

export default function DataSensor() {
  const [field, setField] = useState('ALL');
  const [queryInput, setQueryInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({ field: 'ALL', query: '' });
  const [limit, setLimit] = useState(10);
  const [limitInput, setLimitInput] = useState('10');
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('desc');

  const filterActive =
    appliedFilters.query !== '' ||
    (appliedFilters.field !== 'ALL' &&
      appliedFilters.field !== 'Time' &&
      appliedFilters.field !== 'SensorID');
  const pollInterval = filterActive ? 0 : 3000;
  const cacheKey = `datasensor:${page}:${limit}:${JSON.stringify(appliedFilters)}:${sortOrder}`;

  const { data, error, loading, refetch } = usePolling(
    (signal) => {
      const params = { page, limit, sort: sortOrder };
      const { field: f, query } = appliedFilters;
      if (f === 'Time') {
        params.time = query || undefined;
      } else if (f === 'SensorID') {
        params.sensorId = query || undefined;
      } else {
        if (f !== 'ALL') params.name = f;
        params.value = query || undefined;
      }
      return getDataAll(params, signal);
    },
    pollInterval,
    [page, limit, appliedFilters, sortOrder, pollInterval],
    cacheKey
  );

  // Đảo ngược thứ tự sắp xếp thời gian của bảng (Tăng dần <-> Giảm dần) và đưa về trang đầu tiên.
  function toggleSort() {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setPage(1);
  }

  // Thay đổi giới hạn số bản ghi hiển thị trên mỗi trang.
  function changeLimit(nextLimit) {
    setLimit(nextLimit);
    setPage(1);
  }

  // Xác nhận và áp dụng giới hạn số bản ghi mới sau khi người dùng nhập vào ô.
  function commitLimit() {
    const n = Math.floor(Number(limitInput));
    if (Number.isFinite(n) && n >= 1) {
      changeLimit(n);
      setLimitInput(String(n));
    } else {
      setLimitInput(String(limit));
    }
  }

  // Áp dụng các điều kiện lọc khi form được submit.
  function applyFilter(event) {
    event.preventDefault();
    setAppliedFilters({ field, query: queryInput.trim() });
    setPage(1);
  }

  // Xóa tất cả các điều kiện lọc và đưa bảng về trạng thái mặc định (trang 1, không lọc).
  function clearFilter() {
    setField('ALL');
    setQueryInput('');
    setAppliedFilters({ field: 'ALL', query: '' });
    setPage(1);
  }

  return (
    <div className="page">
      {/* Bộ lọc tìm kiếm dữ liệu */}
      <section className="card">
        <form className="filter-grid" onSubmit={applyFilter}>
          
          <div className="filter-group">
            <label className="filter-label">Search by</label>
            <select
              className="filter-select"
              value={field}
              onChange={(e) => setField(e.target.value)}
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              {field === 'Time' ? 'Time' : field === 'SensorID' ? 'SensorID' : 'Value'}
            </label>
            <input
              type="text"
              className="filter-input"
              placeholder={field === 'Time' ? TIME_HINT : field === 'SensorID' ? 'e.g. qvaq0snp5m' : 'e.g. 30.5'}
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
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

      {/* Bảng dữ liệu cảm biến */}
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
            <table className="data-table data-table-full">
              <thead>
                <tr>
                  <th>SensorID</th>
                  <th>Sensor</th>
                  <th>Value</th>
                  <th className="col-time">Time</th>
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
                    <td className="col-time">{row.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phân trang và số dòng/trang */}
            <div className="table-footer">
              <span className="total-text">
                Total: {data.pagination.total_records} records
              </span>
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