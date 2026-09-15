import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { Action } from '../models/Action.js';
import { Device } from '../models/Device.js';
import { buildInsert, buildSelect, buildUpdate, tableName } from '../utils/queryBuilder.js';
import { publishDeviceControl } from '../config/mqtt.js';
import { ok } from '../utils/response.js';
import { badRequest } from '../utils/ApiError.js';
import { parseFlexibleTime } from '../utils/timeRange.js';

const DEVICE_KEY_TO_CODE = {
  led1: 'LED_01',
  led2: 'LED_02',
};

const CODE_TO_KEY = Object.fromEntries(
  Object.entries(DEVICE_KEY_TO_CODE).map(([key, code]) => [code, key])
);

const pendingTimers = new Map();

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
    columns: ['id', 'code', 'name'],
    order: 'id ASC',
  });
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findDeviceByCode(code) {
  const { sql, params } = buildSelect(Device, {
    columns: ['id', 'code', 'name'],
    where: [{ sql: 'code = ?', params: [code] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function insertAction({ deviceId, action, status }) {
  const { sql, params } = buildInsert(
    Action,
    { deviceID: deviceId, action, status },
    { created_at: 'NOW()' }
  );
  const [result] = await pool.execute(sql, params);
  return result.insertId;
}

async function findLatestLoadingAction(deviceId) {
  const { sql, params } = buildSelect(Action, {
    columns: ['id', 'action'],
    where: [{ sql: 'deviceID = ?', params: [deviceId] }, { sql: "status = 'loading'" }],
    order: 'id DESC',
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
      SELECT MAX(id) AS maxId
      FROM ${tableName('action')}
      GROUP BY deviceID
    ) latest ON latest.maxId = a.id`;
  const [rows] = await pool.query(sql);
  return rows;
}

function buildHistoryConditions({ status, timeRange, deviceId, action }) {
  const where = [];
  if (status && status !== 'ALL') {
    where.push({ sql: 'LOWER(a.status) = ?', params: [String(status).toLowerCase()] });
  }
  if (timeRange) {
    where.push({ sql: 'a.created_at >= ? AND a.created_at <= ?', params: [timeRange.start, timeRange.end] });
  }
  if (deviceId) {
    where.push({ sql: 'a.deviceID = ?', params: [Number(deviceId)] });
  }
  if (action && action !== 'ALL') {
    where.push({ sql: 'a.action = ?', params: [action] });
  }
  return where;
}

async function findHistory({ limit, offset }, filters) {
  const { sql, params } = buildSelect(Action, {
    columns: 'a.id, d.code AS device_id, d.name AS device_name, a.action, UPPER(a.status) AS status, a.created_at',
    alias: 'a',
    joins: `JOIN ${tableName('devices')} d ON d.id = a.deviceID`,
    where: buildHistoryConditions(filters),
    order: 'a.id DESC',
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

export async function getDeviceStatus() {
  const devices = await listDevices();
  const latestByDevice = new Map();
  for (const row of await findLatestActionPerDevice()) {
    latestByDevice.set(row.deviceId, row);
  }
  return devices
    .filter((device) => CODE_TO_KEY[device.code])
    .map((device) => {
      const latest = latestByDevice.get(device.id);
      return {
        device_id: device.code,
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

  const device = await findDeviceByCode(String(deviceId).trim().toUpperCase());
  if (!device) {
    throw badRequest(`Khong tim thay thiet bi ${deviceId}`);
  }
  const ledKey = CODE_TO_KEY[device.code];
  if (!ledKey) {
    throw badRequest(`Thiet bi ${device.code} khong dieu khien duoc qua MQTT`);
  }

  clearPendingTimer(device.id);

  const actionId = await insertAction({
    deviceId: device.id,
    action: normalizedAction,
    status: 'loading',
  });

  publishDeviceControl({
    room_id: env.mqtt.room,
    [ledKey]: normalizedAction.toLowerCase(),
  });

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
        console.log(`[device.timeout] ${device.code} -> FAILED (completion #${failedId})`);
      }
    } catch (error) {
      console.error('[device] timeout insert failed:', error.message);
    }
  }, env.mqtt.actionTimeoutMs);

  pendingTimers.set(device.id, { timer, actionId });

  return {
    action_id: actionId,
    device_id: device.code,
    requested_action: normalizedAction,
    current_status: 'loading',
  };
}

export async function handleDeviceResponse(payload) {
  const entries = Object.entries(payload || {}).filter(([key]) => DEVICE_KEY_TO_CODE[key]);
  if (entries.length === 0) return;

  for (const [key, value] of entries) {
    const code = DEVICE_KEY_TO_CODE[key];
    const device = await findDeviceByCode(code);
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
      console.log(`[device.response] ${code} -> ${state} (completion #${completionId})`);
    }
  }
}

async function queryHistory({ limit, offset }, filters) {
  const [rows, total] = await Promise.all([
    findHistory({ limit, offset }, filters),
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
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
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

    let resolvedDeviceId = null;
    if (req.query.deviceId) {
      const device = await findDeviceByCode(String(req.query.deviceId).trim().toUpperCase());
      if (!device) {
        throw badRequest(`Device ${req.query.deviceId} not found`);
      }
      resolvedDeviceId = device.id;
    }

    const filters = { status, timeRange, deviceId: resolvedDeviceId, action: actionFilter };
    const { rows, total } = await queryHistory({ limit, offset }, filters);

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