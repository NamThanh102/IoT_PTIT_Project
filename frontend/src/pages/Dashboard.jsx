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
import { getDataLatest, getDataChart, getDeviceStatus, postDeviceAction } from '../api/index.js';

const STALE_MS = 10000;
const CONFIRM_WAIT_MS = 6000;

// Định dạng chuỗi thời gian MySQL để chỉ lấy phần giờ, phút, giây.
function formatTime(mysqlTime) {
  if (!mysqlTime) return '';
  return mysqlTime.slice(11);
}

export default function Dashboard() {
  const latestPoll = usePolling(getDataLatest, 2000, [], 'dashboard:latest');
  const chartPoll = usePolling((signal) => getDataChart(30, signal), 2000, [], 'dashboard:chart');
  const devicesPoll = usePolling(getDeviceStatus, 2000, [], 'dashboard:devices');

  const [pending, setPending] = useState({});
  const [toast, setToast] = useState(null);
  const pendingStartRef = useRef({});

  const pollError = latestPoll.error || chartPoll.error || devicesPoll.error;
  const latest = latestPoll.data?.data || null;
  const chart = chartPoll.data?.data || [];
  const deviceList = devicesPoll.data?.data || [];

  const latestAge = latest?.created_at
    ? Date.now() - new Date(String(latest.created_at).replace(' ', 'T')).getTime()
    : Number.POSITIVE_INFINITY;
  const isLive = Boolean(latest) && !pollError && latestAge < STALE_MS;

  // Lấy trạng thái hiển thị của một thiết bị.
  function displayedState(device) {
    return pending[device.name] || device.state;
  }

  // Xóa trạng thái đang chờ xử lý của thiết bị.
  function clearPending(deviceName) {
    delete pendingStartRef.current[deviceName];
    setPending((prev) => {
      if (!(deviceName in prev)) return prev;
      const next = { ...prev };
      delete next[deviceName];
      return next;
    });
  }

  useEffect(() => {
    if (Object.keys(pending).length === 0) return;
    const now = Date.now();
    let changed = false;
    const next = { ...pending };
    for (const device of deviceList) {
      const target = next[device.name];
      if (!target) continue;
      const startedAt = pendingStartRef.current[device.name] || 0;
      if (device.state === target) {
        setToast({
          type: 'success',
          message: `${device.name}: ${target === 'ON' ? 'bật' : 'tắt'} thành công`,
        });
        delete next[device.name];
        delete pendingStartRef.current[device.name];
        changed = true;
      } else if (now - startedAt > CONFIRM_WAIT_MS) {
        setToast({
          type: 'error',
          message: `${device.name}: ${target === 'ON' ? 'bật' : 'tắt'} thất bại`,
        });
        delete next[device.name];
        delete pendingStartRef.current[device.name];
        changed = true;
      }
    }
    if (changed) setPending(next);
  }, [deviceList, pending]);

  // Cảnh báo khi nhiệt độ vượt quá 30 độ C
  // useEffect(() => {
  //   if (latest && latest.temperature > 40) {
  //     setToast({
  //       type: 'error',
  //       message: `CẢNH BÁO: Nhiệt độ vượt ngưỡng an toàn (${latest.temperature}°C)!`,
  //     });
  //   }
  // }, [latest?.temperature]);

  // Chế độ tự động bật/tắt đèn theo ánh sáng (Smart Mode)
  // useEffect(() => {
  //   if (!latest) return;
  //   const led1 = deviceList.find((d) => d.name === 'LED_1');
  //   if (!led1 || pending['LED_1']) return;
  //   if (latest.light < 200 && displayedState(led1) === 'OFF') {
  //     handleToggle(led1);
  //   } else if (latest.light > 800 && displayedState(led1) === 'ON') {
  //     handleToggle(led1);
  //   }
  // }, [latest?.light]);



  // Xử lý bật/tắt thiết bị (optimistic UI + gọi API).
  async function handleToggle(device) {
    if (pending[device.name]) return;
    const target = displayedState(device) === 'ON' ? 'OFF' : 'ON';

    pendingStartRef.current[device.name] = Date.now();
    setPending((prev) => ({ ...prev, [device.name]: target }));

    try {
      await postDeviceAction(device.name, target);
    } catch (error) {
      setToast({ type: 'error', message: `${device.name}: ${error.message}` });
      clearPending(device.name);
    }
  }

  const liveLabel = latestPoll.loading && !latest ? 'Connecting...' : isLive ? 'Live' : 'Sensor Offline';
  // // Bật thông báo Toast đỏ khi cảm biến mất kết nối (quá 10s không có dữ liệu)
  // useEffect(() => {
  //   if (!isLive && latest) {
  //     setToast({
  //       type: 'error',
  //       message: 'CẢNH BÁO: Cảm biến bị mất kết nối (Sensor Offline)!',
  //     });
  //   }
  // }, [isLive]);

  return (
    <div className="page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 3 thẻ thống kê (Nhiệt độ, Độ ẩm, Ánh sáng) */}
      <section className="stat-grid">
        <StatCard
          icon={<TempIcon />}
          from="#fc9797" to="#991b1b" min={0} max={50}
          // from={latest?.temperature > 30 ? "#ff0000" : "#fc9797"} 
          // to={latest?.temperature > 30 ? "#7f0000" : "#991b1b"} 
          label="Temperature"
          unit="°C"
          value={latest ? latest.temperature : null}
        />
        <StatCard
          icon={<HumiIcon />}
          from="#bae6fd" to="#024264" min={0} max={100}
          label="Humidity"
          unit="%"
          value={latest ? latest.humidity : null}
        />
        <StatCard
          icon={<LightIcon />}
          from="#f0ebbc" to="#54fa62" min={0} max={1500}
          label="Light"
          unit="lux"
          value={latest ? latest.light : null}
        />
      </section>

      {/* Biểu đồ cảm biến Realtime */}
      <section className="card chart-card">
        <div className="card-header">
          <h2 className="card-title">Realtime Sensor Data</h2>
          <span className={`live-dot${isLive ? '' : ' offline'}`}>{liveLabel}</span>
        </div>

        {chartPoll.error && (
          <p className="error-text">Cannot load chart: {chartPoll.error}</p>
        )}
        {!chartPoll.error && chart.length === 0 && !chartPoll.loading && (
          <p className="empty-text">No sensor data yet</p>
        )}
        {!chartPoll.error && chart.length > 0 && (
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 50, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                <XAxis
                  dataKey="created_at"
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

      {/* Điều khiển thiết bị (LED) */}
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
                disabled={Boolean(pending[device.name])}
                onClick={() => handleToggle(device)}
              />
            </div>
          ))}
          {devicesPoll.loading && deviceList.length === 0 && <p className="empty-text">Loading devices...</p>}
        </div>
      </section>

      {pollError && <p className="error-text">{pollError}</p>}
    </div>
  );
}