// Tầng nghiệp vụ điều khiển & lịch sử thiết bị
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { Action } from '../models/Action.js';
import { Device } from '../models/Device.js';
import { buildInsert, buildSelect, tableName } from '../utils/queryBuilder.js';
import { newId } from '../utils/id.js';
import { publishDeviceControl } from '../config/mqtt.js';
import { badRequest } from '../utils/ApiError.js';
import { parseFlexibleTime } from '../utils/timeRange.js';

const LED_NAME_TO_KEY = {
  LED_1: 'led1',
  LED_2: 'led2',
};

const KEY_TO_LED_NAME = Object.fromEntries(
  Object.entries(LED_NAME_TO_KEY).map(([name, key]) => [key, name])
);

// Map lưu timer timeout cho từng thiết bị
const pendingTimers = new Map();

// Đợi sang giây kế tiếp để bản ghi phản hồi có timestamp khác bản ghi LOADING
function sleepUntilNextSecond(bufferMs = 50) {
  const delay = 1000 - (Date.now() % 1000) + bufferMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Hủy timer đếm ngược timeout nếu có
function clearPendingTimer(deviceId) {
  const pending = pendingTimers.get(deviceId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingTimers.delete(deviceId);
  }
}

// Tìm thiết bị theo tên chính xác (VD: LED_1)
async function findDeviceByName(name) {
  const { sql, params } = buildSelect(Device, {
    columns: ['id', 'name'],
    where: [{ sql: 'name = ?', params: [name] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Thêm một bản ghi vào bảng action
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

// Tìm bản ghi LOADING gần nhất của thiết bị đang chờ phản hồi
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

// Lấy trạng thái hoạt động hiện tại của tất cả đèn LED (GET /api/device/status)
export async function getDeviceStatus() {
  const { sql: devSql, params: devParams } = buildSelect(Device, {
    columns: ['id', 'name'],
    order: 'name ASC',
  });
  const [devices] = await pool.query(devSql, devParams);

  const actionSql = `
    SELECT a.id, a.action, a.status, a.created_at, a.deviceID AS deviceId
    FROM ${tableName('action')} a
    JOIN (
      SELECT deviceID, MAX(created_at) AS maxCreated
      FROM ${tableName('action')}
      WHERE LOWER(status) <> 'loading'
      GROUP BY deviceID
    ) latest ON latest.deviceID = a.deviceID AND latest.maxCreated = a.created_at
    WHERE LOWER(a.status) <> 'loading'`;
  const [actions] = await pool.query(actionSql);
  const latestByDevice = new Map(actions.map((row) => [row.deviceId, row]));

  return devices
    .filter((device) => LED_NAME_TO_KEY[device.name])
    .map((device) => {
      const latest = latestByDevice.get(device.id);
      let state = 'OFF';
      if (latest) {
        state = latest.status === 'failed' ? (latest.action === 'ON' ? 'OFF' : 'ON') : latest.status;
      }
      return {
        device_id: device.id,
        name: device.name,
        state,
        last_action: latest ? latest.action : null,
        last_status: latest ? latest.status : null,
        updated_at: latest ? latest.created_at : null,
      };
    });
}

// Gửi lệnh điều khiển thiết bị qua MQTT và kích hoạt cơ chế Timeout 5s
export async function sendAction({ deviceId, action }) {
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

  // 1. Lưu bản ghi loading vào Database
  const actionId = await insertAction({
    deviceId: device.id,
    action: normalizedAction,
    status: 'loading',
  });

  // 2. Publish lệnh điều khiển lên MQTT Broker
  try {
    publishDeviceControl({
      [ledKey]: normalizedAction.toLowerCase(),
    });
  } catch (error) {
    clearPendingTimer(device.id);
    await insertAction({
      deviceId: device.id,
      action: normalizedAction,
      status: 'failed',
    });
    throw badRequest(`Gui lenh MQTT that bai: ${error.message}`);
  }

  // 3. Hẹn giờ Timeout (5000ms): Nếu ESP32 không phản hồi -> Ghi bản ghi FAILED
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
        console.log(`[device.timeout] ${device.name} -> FAILED (het thoi gian cho)`);
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

// Xử lý bản tin phản hồi từ ESP32 nhận qua MQTT topic device_response
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

    // Ghi thêm bản ghi thành công/thất bại vào bảng action (giữ lại dòng loading)
    const completionId = await insertAction({
      deviceId: device.id,
      action: pending.action,
      status: state,
    });
    if (completionId) {
      clearPendingTimer(device.id);
      console.log(`[device.response] ${name} -> ${state} (xac nhan thanh cong #${completionId})`);
    }
  }
}

// Xây dựng điều kiện lọc cho bảng lịch sử action
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

// Tìm kiếm danh sách lịch sử thao tác theo bộ lọc
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

// Đếm tổng số bản ghi lịch sử thỏa mãn bộ lọc
async function countHistory(filters) {
  const { sql, params } = buildSelect(Action, {
    columns: 'COUNT(*) AS total',
    alias: 'a',
    where: buildHistoryConditions(filters),
  });
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].total);
}

// Truy vấn lịch sử thao tác thiết bị có phân trang và bộ lọc (GET /api/device/history)
export async function queryHistory({ page = 1, limit = 10, status = 'ALL', time, action, deviceId, deviceID, sort = 'desc' }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  const offset = (safePage - 1) * safeLimit;

  const normalizedStatus = String(status || 'ALL').toUpperCase();
  if (!['ALL', 'ON', 'OFF', 'LOADING', 'FAILED'].includes(normalizedStatus)) {
    throw badRequest('status must be ALL, ON, OFF, LOADING, or FAILED');
  }

  let timeRange = null;
  if (time) {
    timeRange = parseFlexibleTime(time);
    if (!timeRange) throw badRequest('Dinh dang thoi gian khong hop le.');
  }

  const actionFilter = action ? String(action).trim().toUpperCase() : null;
  if (actionFilter && !['ON', 'OFF'].includes(actionFilter)) {
    throw badRequest('action must be ON or OFF');
  }

  let deviceIds = null;
  if (deviceId) {
    const { sql, params } = buildSelect(Device, {
      columns: ['id'],
      where: [{ sql: 'name LIKE ?', params: [`%${String(deviceId).trim()}%`] }],
    });
    const [rows] = await pool.query(sql, params);
    deviceIds = rows.map((row) => row.id);
  }

  const resolvedDeviceID = deviceID ? String(deviceID).trim() : null;
  const sortDir = String(sort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const filters = { status: normalizedStatus, timeRange, deviceIds, deviceID: resolvedDeviceID, action: actionFilter };
  const [rows, total] = await Promise.all([
    findHistory({ limit: safeLimit, offset }, filters, sortDir),
    countHistory(filters),
  ]);

  return {
    rows,
    total,
    page: safePage,
    limit: safeLimit,
  };
}
