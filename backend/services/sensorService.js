// Tầng nghiệp vụ & truy vấn dữ liệu cảm biến
import { pool } from '../config/db.js';
import { DataSensor } from '../models/DataSensor.js';
import { Sensor } from '../models/Sensor.js';
import { buildInsert, buildSelect, tableName } from '../utils/queryBuilder.js';
import { newId } from '../utils/id.js';
import { parseFlexibleTime } from '../utils/timeRange.js';
import { badRequest } from '../utils/ApiError.js';

let sensorIdCache = null;

const GROUPED_SELECT = `
  SELECT
    d.created_at,
    ROUND(MAX(CASE WHEN s.name = 'Temperature' THEN d.value END), 1) AS temperature,
    ROUND(MAX(CASE WHEN s.name = 'Humidity' THEN d.value END), 1) AS humidity,
    MAX(CASE WHEN s.name = 'Light' THEN d.value END) AS light
  FROM ${tableName('datasensors')} d
  JOIN ${tableName('sensors')} s ON s.id = d.sensorID
`;

// Lấy danh sách ánh xạ tên -> ID của các cảm biến (có cache)
async function getSensorIds() {
  if (sensorIdCache) return sensorIdCache;
  const { sql, params } = buildSelect(Sensor, { columns: ['id', 'name'] });
  const [rows] = await pool.query(sql, params);
  sensorIdCache = Object.fromEntries(rows.map((r) => [r.name, r.id]));
  return sensorIdCache;
}

// Lấy N mẫu đo gần nhất (sắp xếp tăng dần theo thời gian) để vẽ biểu đồ
export async function getRecentSamples(limitSamples = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limitSamples) || 20, 200));
  const sql = `${GROUPED_SELECT}
    GROUP BY d.created_at
    ORDER BY d.created_at DESC
    LIMIT ${safeLimit}`;
  const [rows] = await pool.query(sql);
  return rows.reverse();
}

// Xây dựng danh sách điều kiện WHERE cho câu truy vấn cảm biến
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

// Truy vấn danh sách bản ghi cảm biến có phân trang
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

// Đếm tổng số bản ghi thỏa mãn điều kiện lọc
async function countAllData(filters) {
  const { sql, params } = buildSelect(DataSensor, {
    columns: 'COUNT(*) AS total',
    alias: 'd',
    joins: filters.sensorName ? `JOIN ${tableName('sensors')} s ON s.id = d.sensorID` : '',
    where: buildDataConditions(filters),
  });
  const [rows] = await pool.query(sql, params);
  return Number(rows[0].total);
}

// Chuẩn hóa tham số lọc tìm kiếm thời gian, loại cảm biến, giá trị
function resolveFilters({ time, name, value, sensorId }) {
  const timeRange = parseFlexibleTime(time);
  if (time && !timeRange) {
    throw badRequest('Dinh dang thoi gian khong hop le. Vi du: 2026 / 2026-08 / 2026-08-22 / 2026-08-22 10:30');
  }
  const filters = { timeRange };
  if (name) filters.sensorName = String(name).trim();
  if (sensorId) filters.sensorId = String(sensorId).trim();
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    const num = Number(value);
    if (!Number.isFinite(num)) throw badRequest('value must be a number');
    filters.value = num;
  }
  return filters;
}

// Lấy danh sách dữ liệu cảm biến kèm thông tin phân trang (GET /api/data/getall)
export async function queryAllData({ page = 1, limit = 10, time, name, value, sensorId, sort }) {
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

// Lưu gói tin cảm biến nhận từ MQTT vào DB (3 dòng cho 3 loại cảm biến)
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
    const { sql, params } = buildInsert(DataSensor, {
      id: newId(),
      sensorID: ids[sample.name],
      value: Number(sample.value),
      created_at: mysqlTime,
    });
    await pool.execute(sql, params);
  }

  return { savedAt: mysqlTime };
}
