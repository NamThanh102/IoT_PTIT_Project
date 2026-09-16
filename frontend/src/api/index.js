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

export function getDataLatest(signal) {
  return client.get('/data/latest', { signal });
}

export function getDataChart(limit = 20, signal) {
  return client.get('/data/chart', { params: { limit }, signal });
}

export function getDeviceStatus(signal) {
  return client.get('/device/status', { signal });
}

export function getDataAll(params = {}, signal) {
  return client.get('/data/getall', { params, signal });
}

export function postDeviceAction(deviceId, action) {
  return client.post('/device/action', { device_id: deviceId, action });
}

export function getDeviceHistory(params = {}, signal) {
  return client.get('/device/history', { params, signal });
}

export function getProfile(signal) {
  return client.get('/profile', { signal });
}