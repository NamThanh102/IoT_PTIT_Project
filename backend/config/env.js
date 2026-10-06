import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Chuyển đổi an toàn chuỗi sang số kèm giá trị mặc định
function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Đối tượng cấu hình biến môi trường toàn cục (Environment Variables)
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
    actionTimeoutMs: toNumber(process.env.ACTION_TIMEOUT_MS, 5000),
    topics: {
      sensorData: 'sensor_data',
      deviceControl: 'device_control',
      deviceResponse: 'device_response',
    },
  },
  defaultUserId: process.env.DEFAULT_USER_ID || 'usrnamthan',
};
