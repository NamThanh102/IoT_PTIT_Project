/**
 * api/index.js — Lớp gọi REST API duy nhất của frontend (axios)
 *
 * - baseURL = VITE_API_BASE_URL || '/api'; khi dev '/api' đi qua vite proxy → backend :3000.
 * - Response interceptor: trả thẳng response.data ({status,data,message});
 *   lỗi → quy về Error(message từ backend) để component chỉ đọc .message.
 *
 * Hàm export (mỗi hàm GET nhận AbortSignal để huỷ request khi unmount/ẩn tab):
 * - getDataLatest(signal)       GET /data/latest   (Dashboard — thẻ số liệu)
 * - getDataChart(limit, signal) GET /data/chart    (Dashboard — biểu đồ)
 * - getDeviceStatus(signal)     GET /device/status (Dashboard — LED)
 * - getDataAll(params, signal)  GET /data/getall   (DataSensor)
 * - postDeviceAction(id, action)  POST /device/action (Dashboard)
 * - getDeviceHistory(params)    GET /device/history (ActionHistory)
 * - getProfile(signal)          GET /profile (Profile, Layout)
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Khong the ket noi server';
    return Promise.reject(new Error(message));
  }
);

/**
 * Lấy mẫu dữ liệu cảm biến mới nhất (Dashboard)
 * Endpoint: GET /api/data/latest
 * @param {AbortSignal} [signal] - Tín hiệu hủy request (AbortController)
 * @returns {Promise<Object>} Object chứa dữ liệu nhiệt độ, độ ẩm, ánh sáng mới nhất
 */
export function getDataLatest(signal) {
  return client.get('/data/latest', { signal });
}

/**
 * Lấy N mẫu dữ liệu gần nhất để hiển thị biểu đồ realtime (Dashboard)
 * Endpoint: GET /api/data/chart?limit=N
 * @param {number} [limit=20] - Số lượng mẫu cần lấy (tối đa 200)
 * @param {AbortSignal} [signal] - Tín hiệu hủy request
 * @returns {Promise<Object>} Danh sách các mẫu dữ liệu sắp xếp theo thời gian tăng dần
 */
export function getDataChart(limit = 20, signal) {
  return client.get('/data/chart', { params: { limit }, signal });
}

/**
 * Lấy danh sách trạng thái hiện tại của tất cả thiết bị LED (Dashboard)
 * Endpoint: GET /api/device/status
 * @param {AbortSignal} [signal] - Tín hiệu hủy request
 * @returns {Promise<Object>} Mảng các thiết bị kèm trạng thái ('ON', 'OFF', 'loading', 'failed')
 */
export function getDeviceStatus(signal) {
  return client.get('/device/status', { signal });
}

/**
 * Lấy danh sách dữ liệu cảm biến có hỗ trợ phân trang, tìm kiếm và sắp xếp (DataSensor)
 * Endpoint: GET /api/data/getall
 * @param {Object} [params={}] - Tham số query: page, limit, name, time, value, sensorId, sort
 * @param {AbortSignal} [signal] - Tín hiệu hủy request
 * @returns {Promise<Object>} Mảng bản ghi dữ liệu và thông tin phân trang
 */
export function getDataAll(params = {}, signal) {
  return client.get('/data/getall', { params, signal });
}

/**
 * Gửi lệnh điều khiển bật/tắt thiết bị qua MQTT (Dashboard)
 * Endpoint: POST /api/device/action
 * @param {string} deviceId - Tên thiết bị (ví dụ: 'LED_1', 'LED_2')
 * @param {string} action - Hành động mong muốn ('ON' hoặc 'OFF')
 * @returns {Promise<Object>} Kết quả phản hồi trạng thái chờ (HTTP 202, current_status: 'loading')
 */
export function postDeviceAction(deviceId, action) {
  return client.post('/device/action', { device_id: deviceId, action });
}

/**
 * Lấy danh sách lịch sử tác động/điều khiển thiết bị (ActionHistory)
 * Endpoint: GET /api/device/history
 * @param {Object} [params={}] - Tham số query: page, limit, deviceId, action, status, time, sort
 * @param {AbortSignal} [signal] - Tín hiệu hủy request
 * @returns {Promise<Object>} Danh sách lịch sử thao tác và thông tin phân trang
 */
export function getDeviceHistory(params = {}, signal) {
  return client.get('/device/history', { params, signal });
}

/**
 * Lấy thông tin cá nhân sinh viên và các liên kết tài nguyên (Profile)
 * Endpoint: GET /api/profile
 * @param {AbortSignal} [signal] - Tín hiệu hủy request
 * @returns {Promise<Object>} Thông tin sinh viên (tên, MSV, link GitHub, Figma, Postman, Docs)
 */
export function getProfile(signal) {
  return client.get('/profile', { signal });
}