/**
 * pages/Dashboard.jsx — Trang tổng quan: 3 thẻ số liệu + biểu đồ realtime + điều khiển LED
 *
 * Luồng dữ liệu (gọi thẳng các endpoint theo apidocs, poll 2s):
 * - usePolling(getDataLatest, 2000, [], 'dashboard:latest')       → GET /data/latest
 * - usePolling((s) => getDataChart(30, s), 2000, [], 'dashboard:chart') → GET /data/chart?limit=30
 * - usePolling(getDeviceStatus, 2000, [], 'dashboard:devices')    → GET /device/status
 * - latest → 3 StatCard; chart → Recharts LineChart (2 trục Y); devices → 2 card LED + ToggleSwitch.
 * - isLive: dữ liệu trong 10 giây (STALE_MS) → chấm "Live", ngược lại "Sensor Offline".
 *
 * Điều khiển LED: `name` (LED_1/LED_2) là định danh gửi lệnh; `device_id` là khóa chính
 * 10 ký tự (hiển thị trên card). Optimistic + xác nhận qua polling.
 */
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

/**
 * Định dạng chuỗi thời gian MySQL để chỉ lấy phần giờ, phút, giây.
 * @param {string} mysqlTime - Chuỗi thời gian trả về từ MySQL (VD: '2026-09-23 14:36:00')
 * @returns {string} Trả về chuỗi chỉ chứa phần thời gian ('14:36:00') hoặc chuỗi rỗng nếu không có dữ liệu
 */
function formatTime(mysqlTime) {
  if (!mysqlTime) return '';
  return mysqlTime.slice(11);
}

/**
 * Chuyển đổi chuỗi thời gian định dạng MySQL sang timestamp dạng số (milliseconds).
 * @param {string} mysqlTime - Chuỗi thời gian MySQL (VD: '2026-09-23 14:36:00')
 * @returns {number} Thời gian quy đổi sang timestamp (milliseconds)
 */
function parseTime(mysqlTime) {
  return new Date(String(mysqlTime).replace(' ', 'T')).getTime();
}

/**
 * Component Dashboard: Hiển thị trang tổng quan.
 * Bao gồm: 3 thẻ thông số mới nhất, biểu đồ dữ liệu thời gian thực và danh sách thiết bị để điều khiển.
 * @returns {JSX.Element} Giao diện trang Dashboard
 */
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

  const latestAge = latest?.created_at ? Date.now() - parseTime(latest.created_at) : Number.POSITIVE_INFINITY;
  const isLive = Boolean(latest) && !pollError && latestAge < STALE_MS;

  /**
   * Lấy trạng thái hiển thị của một thiết bị.
   * Ưu tiên trạng thái đang chờ xử lý (pending) nếu có, ngược lại trả về trạng thái thật của thiết bị.
   * @param {Object} device - Thông tin của thiết bị
   * @returns {string} Trạng thái cần hiển thị ('ON' hoặc 'OFF')
   */
  function displayedState(device) {
    return pending[device.name] || device.state;
  }

  /**
   * Xóa trạng thái đang chờ xử lý của một thiết bị khỏi state pending.
   * @param {string} deviceName - Tên của thiết bị cần xóa khỏi danh sách pending
   */
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

  /**
   * Xử lý khi người dùng nhấn nút chuyển đổi (toggle) trạng thái thiết bị.
   * Cập nhật trạng thái pending cục bộ ngay lập tức (optimistic UI) và gửi API gọi lệnh.
   * @param {Object} device - Thiết bị cần điều khiển
   */
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

  return (
    <div className="page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* 3 thẻ stat */}
      <section className="stat-grid">
        <StatCard
          icon={<TempIcon />}
          from="#fc9797" to="#991b1b" min={0} max={50}
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

      {/* Chart */}
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

        {/* device-control */}
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