/**
 * utils/queryBuilder.js — Sinh SQL tham số hóa an toàn (chống SQL injection)
 *
 * Hàm export:
 * - tableName(key)      lấy tên bảng theo key đăng ký trong TABLES
 * - buildInsert(model, data, raw)  INSERT chỉ các cột có giá trị; raw = SQL thô (vd NOW())
 * - buildSelect(model, opts)       SELECT với where/joins/group/order/limit/offset
 *
 * Mọi controller dùng chung để tránh lặp cú pháp SQL và rò rỉ tham số.
 */
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

export function tableName(key) {
  const model = TABLES[key];
  if (!model) {
    throw new Error(`Unknown table key: ${key}`);
  }
  return model.table;
}

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