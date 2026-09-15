import { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import ToggleSwitch from '../components/ToggleSwitch.jsx';
import Toast from '../components/Toast.jsx';
import { TempIcon, HumiIcon, LightIcon } from '../components/Icons.jsx';
import { usePolling } from '../hooks/usePolling.js';
import { getDashboard, postDeviceAction } from '../api/index.js';

const STALE_MS = 10000;
const CONFIRM_WAIT_MS = 6000;

function formatTime(mysqlTime) {
  if (!mysqlTime) return '';
  return mysqlTime.slice(11);
}

function parseTime(mysqlTime) {
  return new Date(String(mysqlTime).replace(' ', 'T')).getTime();
}

export default function Dashboard() {
  const dashboard = usePolling(getDashboard, 2000, [], 'dashboard');
  const [pending, setPending] = useState({});
  const [toast, setToast] = useState(null);
  const pendingStartRef = useRef({});

  const data = dashboard.data?.data || null;
  const latest = data?.latest || null;
  const chart = data?.chart || [];
  const deviceList = data?.devices || [];

  const latestAge = latest?.time ? Date.now() - parseTime(latest.time) : Number.POSITIVE_INFINITY;
  const isLive = Boolean(latest) && !dashboard.error && latestAge < STALE_MS;

  function displayedState(device) {
    return pending[device.device_id] || device.state;
  }

  function clearPending(deviceId) {
    delete pendingStartRef.current[deviceId];
    setPending((prev) => {
      if (!(deviceId in prev)) return prev;
      const next = { ...prev };
      delete next[deviceId];
      return next;
    });
  }

  useEffect(() => {
    if (Object.keys(pending).length === 0) return;
    const now = Date.now();
    let changed = false;
    const next = { ...pending };
    for (const device of deviceList) {
      const target = next[device.device_id];
      if (!target) continue;
      const startedAt = pendingStartRef.current[device.device_id] || 0;
      if (device.state === target) {
        setToast({
          type: 'success',
          message: `${device.name}: ${target === 'ON' ? 'bật' : 'tắt'} thành công`,
        });
        delete next[device.device_id];
        delete pendingStartRef.current[device.device_id];
        changed = true;
      } else if (now - startedAt > CONFIRM_WAIT_MS) {
        setToast({
          type: 'error',
          message: `${device.name}: ${target === 'ON' ? 'bật' : 'tắt'} thất bại`,
        });
        delete next[device.device_id];
        delete pendingStartRef.current[device.device_id];
        changed = true;
      }
    }
    if (changed) setPending(next);
  }, [deviceList, pending]);

  async function handleToggle(device) {
    if (pending[device.device_id]) return;
    const target = displayedState(device) === 'ON' ? 'OFF' : 'ON';

    pendingStartRef.current[device.device_id] = Date.now();
    setPending((prev) => ({ ...prev, [device.device_id]: target }));

    try {
      await postDeviceAction(device.device_id, target);
    } catch (error) {
      setToast({ type: 'error', message: `${device.name}: ${error.message}` });
      clearPending(device.device_id);
    }
  }

  const liveLabel = dashboard.loading && !data ? 'Connecting...' : isLive ? 'Live' : 'Sensor Offline';

  return (
    <div className="page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <section className="stat-grid">
        <StatCard
          icon={<TempIcon />}
          from="#fecaca" to="#991b1b" min={0} max={50}
          label="Temperature"
          unit="°C"
          value={latest ? latest.temperature : null}
        />
        <StatCard
          icon={<HumiIcon />}
          from="#bae6fd" to="#0369a1" min={0} max={100}
          label="Humidity"
          unit="%"
          value={latest ? latest.humidity : null}
        />
        <StatCard
          icon={<LightIcon />}
          from="#fef9c3" to="#92400e" min={0} max={1000}
          label="Light"
          unit="lux"
          value={latest ? latest.light : null}
        />
      </section>

      <section className="card chart-card">
        <div className="card-header">
          <h2 className="card-title">Realtime Sensor Data</h2>
          <span className={`live-dot${isLive ? '' : ' offline'}`}>{liveLabel}</span>
        </div>
        {dashboard.error && (
          <p className="error-text">Cannot load chart: {dashboard.error}</p>
        )}
        {!dashboard.error && chart.length === 0 && !dashboard.loading && (
          <p className="empty-text">No sensor data yet</p>
        )}
        {!dashboard.error && chart.length > 0 && (
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 50, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTime}
                  tick={{ fontSize: 11, fill: '#727687' }}
                />
                <YAxis
                  yAxisId="tempHumi"
                  orientation="left"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#727687' }}
                  label={{ value: '°C / %', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#727687' } }}
                />
                <YAxis
                  yAxisId="light"
                  orientation="right"
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: '#727687' }}
                  label={{ value: 'lux', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: '#727687' } }}
                />
                <Tooltip
                  formatter={(value, name) => [`${value}`, name]}
                  labelFormatter={(label) => `Time: ${label}`}
                  contentStyle={{ borderRadius: 10, borderColor: '#d5e0f8', fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="tempHumi" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#ba1a1a" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="tempHumi" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#005f89" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="light" type="monotone" dataKey="light" name="Light (lux)" stroke="#84cc16" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="device-section">
        <h2 className="section-title">Device Control</h2>
        <div className="device-grid">
          {deviceList.map((device) => (
            <div
              className={`card device-card${displayedState(device) === 'ON' ? ' on' : ''}`}
              key={device.device_id}
            >
              <span className="device-card-icon">
                <LightIcon size={18} />
              </span>
              <div className="device-card-info">
                <div className="device-card-name">{device.name}</div>
                <div className="device-card-code">{device.device_id}</div>
              </div>
              <ToggleSwitch
                state={displayedState(device)}
                disabled={Boolean(pending[device.device_id])}
                onClick={() => handleToggle(device)}
              />
            </div>
          ))}
          {dashboard.loading && <p className="empty-text">Loading devices...</p>}
        </div>
      </section>

      {dashboard.error && <p className="error-text">{dashboard.error}</p>}
    </div>
  );
}