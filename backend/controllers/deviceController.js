/**
 * controllers/deviceController.js — Nghiệp vụ điều khiển thiết bị (LED)
 *
 * Hàm export:
 * - postAction(req)      POST /api/device/action: ghi dòng LOADING → publish MQTT → hẹn timeout
 * - handleDeviceResponse(payload)  [MQTT] thiết bị phản hồi → chờ sang giây kế tiếp
 *                                  rồi ghi THÊM dòng ON/OFF (giữ dòng LOADING) để đảm bảo thứ tự
 * - getStatus(req)       GET /api/device/status
 * - getHistory(req)      GET /api/device/history (page/limit + lọc status, action, deviceId/deviceID, time + sort)
 * - getDeviceStatus()    trạng thái các LED điều khiển được (device_id = khóa chính 10 ký tự, name = LED_x)
 *
 * Luồng lệnh: LOADING (bấm nút) → ON/OFF/FAILED (phản hồi ESP32, timeout env.mqtt.actionTimeoutMs,
 * hoặc publish MQTT fail ngay lúc gọi — vẫn ghi FAILED để không kẹt dòng LOADING).
 * LED_NAME_TO_KEY map tên thiết bị → key topic MQTT (LED_1→led1, LED_2→led2);
 * `name` (LED_1/LED_2) là định danh thiết bị, không còn cột code.
 */
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { Action } from '../models/Action.js';
import { Device } from '../models/Device.js';
import { buildInsert, buildSelect, tableName } from '../utils/queryBuilder.js';
import { newId } from '../utils/id.js';
import { publishDeviceControl } from '../config/mqtt.js';
import { ok } from '../utils/response.js';
import { badRequest } from '../utils/ApiError.js';
import { parseFlexibleTime } from '../utils/timeRange.js';

const LED_NAME_TO_KEY = {
  LED_1: 'led1',
  LED_2: 'led2',
};

const KEY_TO_LED_NAME = Object.fromEntries(
  Object.entries(LED_NAME_TO_KEY).map(([name, key]) => [key, name])
);

const pendingTimers = new Map();

function sleepUntilNextSecond(bufferMs = 50) {
  const delay = 1000 - (Date.now() % 1000) + bufferMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function clearPendingTimer(deviceId) {
  const pending = pendingTimers.get(deviceId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingTimers.delete(deviceId);
  }
}

function normalizeState(status, action) {
  if (status === 'loading') return 'loading';
  if (status === 'failed') return action === 'ON' ? 'OFF' : 'ON';
  return status;
}

async function listDevices() {
  const { sql, params } = buildSelect(Device, {
    columns: ['id', 'name'],
    order: 'name ASC',
  });
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findDeviceByName(name) {
  const { sql, params } = buildSelect(Device, {
    columns: ['id', 'name'],
    where: [{ sql: 'name = ?', params: [name] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function findDevicesByNamePart(namePart) {
  const { sql, params } = buildSelect(Device, {
    columns: ['id'],
    where: [{ sql: 'name LIKE ?', params: [`%${namePart}%`] }],
  });
  const [rows] = await pool.query(sql, params);
  return rows.map((row) => row.id);
}

async function insertAction({ deviceId, action, status }) {
  const id = newId();
  const { sql, params } = buildInsert(
    Action,
    { id, userID: env.defaultUserId, deviceID: deviceId, action, status },
    { created_at: 'NOW()' }
  );
  await pool.execute(sql, params);
  return id;
}

async function findLatestLoadingAction(deviceId) {
  const { sql, params } = buildSelect(Action, {
    columns: ['id', 'action'],
    where: [{ sql: 'deviceID = ?', params: [deviceId] }, { sql: "status = 'loading'" }],
    order: 'created_at DESC, id DESC',
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function findLatestActionPerDevice() {
  const sql = `
    SELECT a.id, a.action, a.status, a.created_at, a.deviceID AS deviceId
    FROM ${tableName('action')} a
    JOIN (
      SELECT deviceID, MAX(created_at) AS maxCreated
      FROM ${tableName('action')}
      WHERE LOWER(status) <> 'loading'
      GROUP BY deviceID
    ) latest ON latest.deviceID = a.deviceID AND latest.maxCreated = a.created_at
    WHERE LOWER(a.status) <> 'loading'`;
  const [rows] = await pool.query(sql);
  return rows;
}

function buildHistoryConditions({ status, timeRange, deviceIds, deviceID, action }) {
  const where = [];
  if (status && status !== 'ALL') {
    where.push({ sql: 'LOWER(a.status) = ?', params: [String(status).toLowerCase()] });
  }
  if (timeRange) {
    where.push({ sql: 'a.created_at >= ? AND a.created_at <= ?', params: [timeRange.start, timeRange.end] });
  }
  if (deviceIds) {
    if (deviceIds.length === 0) {
      where.push({ sql: '1 = 0' });
    } else {
      where.push({
        sql: `a.deviceID IN (${deviceIds.map(() => '?').join(', ')})`,
        params: deviceIds,
      });
    }
  }
  if (deviceID) {
    where.push({ sql: 'a.deviceID = ?', params: [deviceID] });
  }
  if (action && action !== 'ALL') {
    where.push({ sql: 'a.action = ?', params: [action] });
  }
  return where;
}

async function findHistory({ limit, offset }, filters, sortDir) {
  const { sql, params } = buildSelect(Action, {
    columns: 'a.id, a.userID, a.deviceID AS device_id, d.name AS device_name, a.action, UPPER(a.status) AS status, a.created_at',
    alias: 'a',
    joins: `JOIN ${tableName('devices')} d ON d.id = a.deviceID`,
    where: buildHistoryConditions(filters),
    order: sortDir === 'asc' ? 'a.created_at ASC, a.id ASC' : 'a.created_at DESC, a.id DESC',
    limit,
    offset,
  });
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function countHistory(filters) {
  const { sql, params } = buildSelect(Action, {
    columns: 'COUNT(*) AS total',
    alias: 'a',
    where: buildHistoryConditions(filters),
  });
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].total);
}

async function getDeviceStatus() {
  const devices = await listDevices();
  const latestByDevice = new Map();
  for (const row of await findLatestActionPerDevice()) {
    latestByDevice.set(row.deviceId, row);
  }
  return devices
    .filter((device) => LED_NAME_TO_KEY[device.name])
    .map((device) => {
      const latest = latestByDevice.get(device.id);
      return {
        device_id: device.id,
        name: device.name,
        state: latest ? normalizeState(latest.status, latest.action) : 'OFF',
        last_action: latest ? latest.action : null,
        last_status: latest ? latest.status : null,
        updated_at: latest ? latest.created_at : null,
      };
    });
}

async function sendAction({ deviceId, action }) {
  if (!deviceId || !action) {
    throw badRequest('Thieu device_id hoac action');
  }
  const normalizedAction = String(action).trim().toUpperCase();
  if (!['ON', 'OFF'].includes(normalizedAction)) {
    throw badRequest('action chi nhan ON hoac OFF');
  }

  const device = await findDeviceByName(String(deviceId).trim().toUpperCase());
  if (!device) {
    throw badRequest(`Khong tim thay thiet bi ${deviceId}`);
  }
  const ledKey = LED_NAME_TO_KEY[device.name];
  if (!ledKey) {
    throw badRequest(`Thiet bi ${device.name} khong dieu khien duoc qua MQTT`);
  }

  clearPendingTimer(device.id);

  const actionId = await insertAction({
    deviceId: device.id,
    action: normalizedAction,
    status: 'loading',
  });

  try {
    publishDeviceControl({
      room_id: env.mqtt.room,
      [ledKey]: normalizedAction.toLowerCase(),
    });
  } catch (error) {
    clearPendingTimer(device.id);
    const failedId = await insertAction({
      deviceId: device.id,
      action: normalizedAction,
      status: 'failed',
    });
    if (failedId) {
      console.log(`[device.pubFailed] ${device.name} -> FAILED (completion #${failedId})`);
    }
    throw badRequest(`Gui lenh MQTT that bai: ${error.message}`);
  }

  const timer = setTimeout(async () => {
    try {
      const pending = await findLatestLoadingAction(device.id);
      if (pending === null) return;
      const failedId = await insertAction({
        deviceId: device.id,
        action: pending.action,
        status: 'failed',
      });
      if (failedId) {
        clearPendingTimer(device.id);
        console.log(`[device.timeout] ${device.name} -> FAILED (completion #${failedId})`);
      }
    } catch (error) {
      console.error('[device] timeout insert failed:', error.message);
    }
  }, env.mqtt.actionTimeoutMs);

  pendingTimers.set(device.id, { timer, actionId });

  return {
    action_id: actionId,
    device_id: device.name,
    requested_action: normalizedAction,
    current_status: 'loading',
  };
}

export async function handleDeviceResponse(payload) {
  const entries = Object.entries(payload || {}).filter(([key]) => KEY_TO_LED_NAME[key]);
  if (entries.length === 0) return;

  await sleepUntilNextSecond();

  for (const [key, value] of entries) {
    const name = KEY_TO_LED_NAME[key];
    const device = await findDeviceByName(name);
    if (!device) continue;

    const state = String(value).trim().toUpperCase();
    const pending = await findLatestLoadingAction(device.id);
    if (pending === null) continue;

    const completionId = await insertAction({
      deviceId: device.id,
      action: pending.action,
      status: state,
    });
    if (completionId) {
      clearPendingTimer(device.id);
      console.log(`[device.response] ${name} -> ${state} (completion #${completionId})`);
    }
  }
}

async function queryHistory({ limit, offset }, filters, sortDir) {
  const [rows, total] = await Promise.all([
    findHistory({ limit, offset }, filters, sortDir),
    countHistory(filters),
  ]);
  return { rows, total };
}

export async function getStatus(req, res, next) {
  try {
    const data = await getDeviceStatus();
    return ok(res, { data, message: 'Lay trang thai thiet bi thanh cong' });
  } catch (error) {
    return next(error);
  }
}

export async function postAction(req, res, next) {
  try {
    const { device_id, action } = req.body || {};
    const result = await sendAction({ deviceId: device_id, action });
    return ok(res, {
      data: result,
      message: 'Lenh dang duoc xu ly',
      httpStatus: 202,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getHistory(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 100));
    const offset = (page - 1) * limit;

    const status = String(req.query.status || 'ALL').toUpperCase();
    if (!['ALL', 'ON', 'OFF', 'LOADING', 'FAILED'].includes(status)) {
      throw badRequest('status must be ALL, ON, OFF, LOADING, or FAILED');
    }

    let timeRange = null;
    if (req.query.time) {
      timeRange = parseFlexibleTime(req.query.time);
      if (!timeRange) {
        throw badRequest('Invalid time format. Example: 2026-08-22 10:30');
      }
    }

    const actionFilter = req.query.action ? String(req.query.action).trim().toUpperCase() : null;
    if (actionFilter && !['ON', 'OFF'].includes(actionFilter)) {
      throw badRequest('action must be ON or OFF');
    }

    let deviceIds = null;
    if (req.query.deviceId) {
      deviceIds = await findDevicesByNamePart(String(req.query.deviceId).trim());
    }

    const resolvedDeviceID = req.query.deviceID
      ? String(req.query.deviceID).trim()
      : null;
    const sortDir = String(req.query.sort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const filters = { status, timeRange, deviceIds, deviceID: resolvedDeviceID, action: actionFilter };
    const { rows, total } = await queryHistory({ limit, offset }, filters, sortDir);

    return ok(res, {
      data: rows,
      pagination: {
        current_page: page,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        total_records: total,
      },
      message: 'Lay lich su thao tac thanh cong',
    });
  } catch (error) {
    return next(error);
  }
}