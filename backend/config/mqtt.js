import mqtt from 'mqtt';
import { env } from './env.js';

let client = null;

// Parse an toàn chuỗi JSON từ MQTT payload buffer/string, tránh văng lỗi làm crash ứng dụng
function safeParse(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    console.warn(`[mqtt] JSON khong hop le: ${raw.toString().slice(0, 120)}`);
    return null;
  }
}

// Khởi tạo kết nối MQTT Client đến broker, sub các topic cần thiết
export function connectMqtt(handlers = {}) {
  client = mqtt.connect(env.mqtt.url, {
    clientId: env.mqtt.clientId,
    username: env.mqtt.username || undefined,
    password: env.mqtt.password || undefined,
    reconnectPeriod: 3000,
    connectTimeout: 5000,
  });

  client.on('connect', () => {
    console.log(`[mqtt] Da ket noi broker ${env.mqtt.url}`);
    client.subscribe([env.mqtt.topics.sensorData, env.mqtt.topics.deviceResponse], (error) => {
      if (error) {
        console.error('[mqtt] Dang ky SUB that bai:', error.message);
        return;
      }
      console.log(`[mqtt] SUB ok -> "${env.mqtt.topics.sensorData}" va "${env.mqtt.topics.deviceResponse}"`);
    });
  });

  client.on('message', (topic, rawPayload) => {
    const payload = safeParse(rawPayload);
    if (!payload) return;

    if (topic === env.mqtt.topics.sensorData) {
      handlers.sensorData?.({
        temp: payload.temp,
        humi: payload.humi,
        light: payload.light,
      })
        .then(() => {
          console.log(
            `[sensor_data] temp=${payload.temp} humi=${payload.humi} light=${payload.light}`
          );
        })
        .catch((error) => {
          console.error('[sensor_data] luu DB that bai:', error.message);
        });
    } else if (topic === env.mqtt.topics.deviceResponse) {
      handlers.deviceResponse?.(payload).catch((error) => {
        console.error('[device_response] cap nhat that bai:', error.message);
      });
    }
  });

  client.on('error', (error) => {
    console.error('[mqtt] Loi:', error.message);
  });

  client.on('reconnect', () => {
    console.log('[mqtt] Dang thu ket noi lai broker...');
  });

  return client;
}

// Gửi lệnh điều khiển thiết bị lên topic MQTT
export function publishDeviceControl(payload) {
  if (!client) {
    throw new Error('MQTT chua san sang');
  }
  client.publish(env.mqtt.topics.deviceControl, JSON.stringify(payload));
  console.log(`[device_control] PUB: ${JSON.stringify(payload)}`);
}