import 'dotenv/config';

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
  sensorNodeDeviceId: toNumber(process.env.SENSOR_NODE_DEVICE_ID, 4),
  defaultUserId: toNumber(process.env.DEFAULT_USER_ID, 1),
};
