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

export function getDashboard(signal) {
  return client.get('/dashboard', { signal });
}

export function getDataLatest(signal) {
  return client.get('/data/latest', { signal });
}

export function getDataChart(limit = 30, signal) {
  return client.get('/data/chart', { params: { limit }, signal });
}

export function getDataAll(params = {}, signal) {
  return client.get('/data/getall', { params, signal });
}

export function getDeviceStatus(signal) {
  return client.get('/device/status', { signal });
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