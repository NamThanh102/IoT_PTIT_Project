import { User } from '../models/User.js';
import { Sensor } from '../models/Sensor.js';
import { Device } from '../models/Device.js';
import { DataSensor } from '../models/DataSensor.js';
import { Action } from '../models/Action.js';

export const TABLES = {
  users: User,
  sensors: Sensor,
  devices: Device,
  datasensors: DataSensor,
  action: Action,
};

// Lấy tên bảng tương ứng từ từ khóa định danh bảng đã đăng ký trong TABLES
export function tableName(key) {
  const model = TABLES[key];
  if (!model) {
    throw new Error(`Unknown table key: ${key}`);
  }
  return model.table;
}

// Xây dựng câu lệnh INSERT SQL kèm mảng tham số chuẩn hóa (Prepared Statement)
export function buildInsert(model, data, raw = {}) {
  const columns = [];
  const placeholders = [];
  const params = [];
  for (const column of model.columns) {
    if (Object.prototype.hasOwnProperty.call(raw, column)) {
      columns.push(column);
      placeholders.push(raw[column]);
      continue;
    }
    if (data[column] !== undefined && data[column] !== null) {
      columns.push(column);
      placeholders.push('?');
      params.push(data[column]);
    }
  }
  const sql = `INSERT INTO ${model.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
  return { sql, params };
}

// Xây dựng câu truy vấn SELECT SQL linh hoạt có hỗ trợ alias, JOIN, WHERE, ORDER BY, LIMIT, OFFSET
export function buildSelect(model, { columns, alias = '', joins = '', where = [], group = '', order, limit, offset } = {}) {
  const params = [];
  const colList = columns || model.columns.join(', ');
  const src = alias ? `${model.table} ${alias}` : model.table;
  const whereSql = where.length ? ` WHERE ${where.map((w) => w.sql).join(' AND ')}` : '';
  for (const w of where) params.push(...(w.params || []));
  let sql = `SELECT ${colList} FROM ${src}${joins ? ` ${joins}` : ''}${whereSql}`;
  if (group) sql += ` GROUP BY ${group}`;
  if (order) sql += ` ORDER BY ${order}`;
  if (limit !== undefined) sql += ` LIMIT ${Number(limit)}`;
  if (offset !== undefined) sql += ` OFFSET ${Number(offset)}`;
  return { sql, params };
}