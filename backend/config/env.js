/**
 * config/env.js — Đọc & chuẩn hóa cấu hình từ biến môi trường (.env)
 *
 * Vai trò: "nguồn sự thật" duy nhất về cấu hình; mọi module dùng `env`
 * thay vì đọc process.env rải rác. Hàm toNumber cho fallback an toàn.
 *
 * Nhóm giá trị:
 * - port: cổng HTTP server
 * - db: host/port/user/password/database/connectionLimit (MySQL pool, xem db.js)
 * - mqtt: url broker, username/password, room, timeout lệnh, các topic
 * - defaultUserId: user mặc định cho /api/profile và cột userID trong action
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  port: toNumber(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'iot_db',
    connectionLimit: toNumber(process.env.DB_POOL_SIZE, 10),
  },
  mqtt: {
    url: process.env.MQTT_URL || 'mqtt://127.0.0.1:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    clientId: process.env.MQTT_CLIENT_ID || 'iot-backend',
    room: process.env.MQTT_ROOM || 'room1',
    actionTimeoutMs: toNumber(process.env.ACTION_TIMEOUT_MS, 5000),
    topics: {
      sensorData: 'sensor_data',
      deviceControl: 'device_control',
      deviceResponse: 'device_response',
    },
  },
  defaultUserId: process.env.DEFAULT_USER_ID || 'usrnamthan',
};
