import { useState } from 'react';
import Pagination from '../components/Pagination.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDataAll } from '../api/index.js';

const TIME_HINT =
  'Flexible: 2026 | 2026-08 | 2026-08-22 | 2026-08-22 10 | 2026-08-22 10:30 | 2026-08-22 10:30:45';

const UNIT_MAP = { TEMP: '°C', HUMI: '%', LIGHT: 'lux' };
const TYPE_COLOR = { TEMP: '#b91c1c', HUMI: '#0369a1', LIGHT: '#a16207' };

export default function DataSensor() {
  const [sensorIdInput, setSensorIdInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    sensorId: '',
    type: '',
    value: '',
    time: '',
  });
  const [page, setPage] = useState(1);

  const { data, error, loading, refetch } = usePolling(
    (signal) =>
      getDataAll(
        {
          page,
          limit: 10,
          sensorId: appliedFilters.sensorId,
          type: appliedFilters.type,
          value: appliedFilters.value,
          time: appliedFilters.time,
        },
        signal
      ),
    3000,
    [page, appliedFilters],
    'datasensor'
  );

  function applyFilter(event) {
    event.preventDefault();
    setAppliedFilters({
      sensorId: sensorIdInput.trim(),
      type: typeInput,
      value: valueInput.trim(),
      time: timeInput.trim(),
    });
    setPage(1);
  }

  function clearFilter() {
    setSensorIdInput('');
    setTypeInput('');
    setValueInput('');
    setTimeInput('');
    setAppliedFilters({ sensorId: '', type: '', value: '', time: '' });
    setPage(1);
  }

  return (
    <div className="page">
      <section className="card">
        <form className="filter-grid" onSubmit={applyFilter}>
          <div className="filter-group">
            <label className="filter-label">Sensor ID</label>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. TEMP_A3F8B2C1"
              value={sensorIdInput}
              onChange={(event) => setSensorIdInput(event.target.value)}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Sensor Type</label>
            <select
              className="filter-select"
              value={typeInput}
              onChange={(event) => setTypeInput(event.target.value)}
            >
              <option value="">All</option>
              <option value="TEMP">TEMP (Temperature)</option>
              <option value="HUMI">HUMI (Humidity)</option>
              <option value="LIGHT">LIGHT (Light)</option>
            </select>
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
        <p className="hint-text">
          All filters can be combined. Leave blank to skip a filter.
        </p>
      </section>

      <section className="card table-card">
        <div className="card-header">
          <h3 className="card-title">Sensor Data</h3>
          <button className="btn-reload" onClick={refetch}>↻ Reload</button>
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
                  {/* <th>ID</th> */}
                  <th>SensorID</th>
                  <th>Sensor Type</th>
                  <th>Value</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row) => (
                  <tr key={row.id}>
                    {/* <td>{row.id}</td> */}
                    <td>
                      <span className="sensor-code">{row.sensorID}</span>
                    </td>
                    <td style={{ color: TYPE_COLOR[row.sensorCode], fontWeight: 600 }}>
                      {row.name}
                    </td>
                    <td className="value-cell">
                      {row.value}
                      <span className="value-unit">{UNIT_MAP[row.sensorCode] || ''}</span>
                    </td>
                    <td>{row.time}</td>
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
