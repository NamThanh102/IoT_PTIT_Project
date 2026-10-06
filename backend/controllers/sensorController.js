import { pool } from '../config/db.js';
import { DataSensor } from '../models/DataSensor.js';
import { Sensor } from '../models/Sensor.js';
import { buildInsert, buildSelect, tableName } from '../utils/queryBuilder.js';
import { newId } from '../utils/id.js';
import { parseFlexibleTime } from '../utils/timeRange.js';
import { ok } from '../utils/response.js';
import { badRequest } from '../utils/ApiError.js';

const SENSOR_NAMES = ['Temperature', 'Humidity', 'Light'];

const GROUPED_SELECT = `
  SELECT
    d.created_at,
    ROUND(MAX(CASE WHEN s.name = 'Temperature' THEN d.value END), 1) AS temperature,
    ROUND(MAX(CASE WHEN s.name = 'Humidity' THEN d.value END), 1) AS humidity,
    MAX(CASE WHEN s.name = 'Light' THEN d.value END) AS light
  FROM ${tableName('datasensors')} d
  JOIN ${tableName('sensors')} s ON s.id = d.sensorID
`;

// ============================================================
// NHÓM 1: HÀM PHỤ PHỤC VỤ DỮ LIỆU REALTIME & BIỂU ĐỒ (Dùng cho getLatest, getChart)
// ============================================================

// Lấy mẫu dữ liệu cảm biến mới nhất
async function getLatestSample() {
  const sql = `${GROUPED_SELECT}
    GROUP BY d.created_at
    ORDER BY d.created_at DESC
    LIMIT 1`;
  const [rows] = await pool.query(sql);
  return rows.length > 0 ? rows[0] : null;
}

// Lấy danh sách các mẫu dữ liệu cảm biến gần đây
async function getRecentSamples(limitSamples) {
  const safeLimit = Math.max(1, Math.min(Number(limitSamples) || 20, 200));
  const sql = `${GROUPED_SELECT}
    GROUP BY d.created_at
    ORDER BY d.created_at DESC
    LIMIT ${safeLimit}`;
  const [rows] = await pool.query(sql);
  return rows.reverse();
}

// ============================================================
// NHÓM 2: HÀM PHỤ PHỤC VỤ LƯU DỮ LIỆU CẢM BIẾN TỪ MQTT (Dùng cho saveSensorSample)
// ============================================================

// Tìm kiếm id của cảm biến theo tên
async function findSensorByName(name) {
  const { sql, params } = buildSelect(Sensor, {
    columns: ['id'],
    where: [{ sql: 'name = ?', params: [name] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0].id : null;
}

// Lấy danh sách ID của tất cả các cảm biến
async function getSensorIds() {
  const map = {};
  for (const name of SENSOR_NAMES) {
    map[name] = await findSensorByName(name);
  }
  return map;
}

// Thêm một mẫu dữ liệu cảm biến mới vào database
async function insertSample({ sensorId, value, time }) {
  const { sql, params } = buildInsert(DataSensor, {
    id: newId(),
    sensorID: sensorId,
    value,
    created_at: time,
  });
  await pool.execute(sql, params);
}

// ============================================================
// NHÓM 3: HÀM PHỤ PHỤC VỤ BẢNG DỮ LIỆU CẢM BIẾN (Dùng cho getAllData)
// ============================================================

// Chuẩn hóa và xác thực các bộ lọc dữ liệu
function resolveFilters({ time, name, value, sensorId }) {
  const timeRange = parseFlexibleTime(time);
  if (time && !timeRange) {
    throw badRequest('Dinh dang thoi gian khong hop le. Vi du: 2026 / 2026-08 / 2026-08-22 / "2026-08-22 10" / "2026-08-22 10:30" / "2026-08-22 10:30:45"');
  }
  const filters = { timeRange };
  if (name) {
    filters.sensorName = String(name).trim();
  }
  if (sensorId) {
    filters.sensorId = String(sensorId).trim();
  }
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw badRequest('value must be a number');
    }
    filters.value = num;
  }
  return filters;
}

// Xây dựng các điều kiện lọc dữ liệu cảm biến
function buildDataConditions({ timeRange, sensorName, sensorId, value }) {
  const where = [];
  if (timeRange) {
    where.push({ sql: 'd.created_at >= ? AND d.created_at <= ?', params: [timeRange.start, timeRange.end] });
  }
  if (sensorName) {
    where.push({ sql: 's.name LIKE ?', params: [`%${sensorName}%`] });
  }
  if (sensorId) {
    where.push({ sql: 'd.sensorID = ?', params: [sensorId] });
  }
  if (value !== undefined && value !== null) {
    where.push({ sql: 'ROUND(d.value, 1) = ROUND(?, 1)', params: [value] });
  }
  return where;
}

// Tìm kiếm tất cả dữ liệu cảm biến với phân trang và lọc
async function findAllData({ limit, offset }, filters, sortDir) {
  const { sql, params } = buildSelect(DataSensor, {
    columns: 'd.id, s.id AS sensorID, s.name AS name, d.value, d.created_at',
    alias: 'd',
    joins: `JOIN ${tableName('sensors')} s ON s.id = d.sensorID`,
    where: buildDataConditions(filters),
    order: sortDir === 'asc' ? 'd.created_at ASC, d.id ASC' : 'd.created_at DESC, d.id DESC',
    limit,
    offset,
  });
  const [rows] = await pool.query(sql, params);
  return rows;
}

// Đếm tổng số lượng dữ liệu cảm biến theo bộ lọc
async function countAllData(filters) {
  const { sql, params } = buildSelect(DataSensor, {
    columns: 'COUNT(*) AS total',
    alias: 'd',
    joins: filters.sensorName
      ? `JOIN ${tableName('sensors')} s ON s.id = d.sensorID`
      : '',
    where: buildDataConditions(filters),
  });
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].total);
}

// Truy vấn dữ liệu cảm biến và phân trang (dùng cho API)
async function queryAllData({ page = 1, limit = 10, time, name, value, sensorId, sort }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
  const offset = (safePage - 1) * safeLimit;
  const sortDir = String(sort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const filters = resolveFilters({ time, name, value, sensorId });
  const [rows, total] = await Promise.all([
    findAllData({ limit: safeLimit, offset }, filters, sortDir),
    countAllData(filters),
  ]);

  return {
    rows,
    pagination: {
      current_page: safePage,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
      total_records: total,
    },
  };
}

//===================================================================================================

// MQTT Handler: Lưu mẫu dữ liệu cảm biến vào DB (Sử dụng hàm phụ: getSensorIds, insertSample)
export async function saveSensorSample({ temp, humi, light }) {
  const ids = await getSensorIds();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const mysqlTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const samples = [
    { name: 'Temperature', value: temp },
    { name: 'Humidity', value: humi },
    { name: 'Light', value: light },
  ];

  for (const sample of samples) {
    if (sample.value === undefined || sample.value === null || Number.isNaN(Number(sample.value))) continue;
    await insertSample({
      sensorId: ids[sample.name],
      value: Number(sample.value),
      time: mysqlTime,
    });
  }

  return { savedAt: mysqlTime };
}

// API Handler: Lấy dữ liệu 1 cảm biến mới nhất (Sử dụng hàm phụ: getLatestSample)
export async function getLatest(req, res, next) {
  try {
    const data = await getLatestSample();
    return ok(res, { data, message: 'Lay du lieu cam bien moi nhat thanh cong' });
  } catch (error) {
    return next(error);
  }
}

// API Handler: Lấy dữ liệu n cảm biến để vẽ chart (Sử dụng hàm phụ: getRecentSamples)
export async function getChart(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 20;
    const data = await getRecentSamples(limit);
    return ok(res, { data, message: 'Lay du lieu bieu do thanh cong' });
  } catch (error) {
    return next(error);
  }
}

// API Handler: Lấy tất cả dữ liệu cảm biến có lọc và phân trang (Sử dụng hàm phụ: queryAllData -> resolveFilters, findAllData, countAllData)
export async function getAllData(req, res, next) {
  try {
    const { page = 1, limit = 10, time, name, value, sensorId, sort } = req.query;
    const { rows, pagination } = await queryAllData({ page, limit, time, name, value, sensorId, sort });
    if (rows.length === 0 && (time || name || value || sensorId)) {
      return ok(res, {
        data: [],
        pagination,
        message: 'No matching records found',
      });
    }
    return ok(res, {
      data: rows,
      pagination,
      message: 'Lay du lieu thanh cong',
    });
  } catch (error) {
    return next(error);
  }
}