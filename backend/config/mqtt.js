/**
 * config/mqtt.js — Wrapper MQTT client (kênh giao tiếp với ESP32)
 *
 * Tính năng:
 * - connectMqtt(handlers): kết nối broker, SUB topic sensor_data + device_response
 * - message → parse JSON (sai định dạng thì bỏ qua, chỉ log) → gọi handler:
 *     sensorData   → saveSensorSample (ghi mẫu cảm biến vào DB)
 *     deviceResponse → handleDeviceResponse (ghi kết quả lệnh bật/tắt)
 * - Tự reconnect mỗi 3s khi broker tắt, không crash backend
 * - publishDeviceControl(payload): PUB topic device_control (gửi lệnh tới ESP32)
 *
 * Luồng: ESP32 --sensor_data--> saveSensorSample
 *        ESP32 --device_response--> handleDeviceResponse
 *        backend --device_control--> ESP32
 */
import mqtt from 'mqtt';
import { env } from './env.js';

let client = null;

function safeParse(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    console.warn(`[mqtt] JSON khong hop le: ${raw.toString().slice(0, 120)}`);
    return null;
  }
}

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
      console.log(
        `[mqtt] SUB ok -> "${env.mqtt.topics.sensorData}" va "${env.mqtt.topics.deviceResponse}"`
      );
    });
  });

  client.on('message', (topic, rawPayload) => {
    if (topic === env.mqtt.topics.sensorData) {
      const payload = safeParse(rawPayload);
      if (!payload) return;

      const room = payload.device_id || env.mqtt.room;
      handlers.sensorData?.({
        room,
        temp: payload.temp,
        humi: payload.humi,
        light: payload.light,
      })
        .then(() => {
          console.log(
            `[sensor_data] room=${room} temp=${payload.temp} humi=${payload.humi} light=${payload.light}`
          );
        })
        .catch((error) => {
          console.error('[sensor_data] luu DB that bai:', error.message);
        });
    } else if (topic === env.mqtt.topics.deviceResponse) {
      const payload = safeParse(rawPayload);
      if (!payload) return;

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

export function publishDeviceControl(payload) {
  if (!client) {
    throw new Error('MQTT chua san sang');
  }
  client.publish(env.mqtt.topics.deviceControl, JSON.stringify(payload));
  console.log(`[device_control] PUB: ${JSON.stringify(payload)}`);
}