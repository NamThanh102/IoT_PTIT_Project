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
    if (column === model.primaryKey) continue;
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

export function buildUpdate(model, data, where = [], raw = {}) {
  const setClauses = [];
  const params = [];
  for (const column of model.columns) {
    if (column === model.primaryKey) continue;
    if (Object.prototype.hasOwnProperty.call(raw, column)) {
      setClauses.push(`${column} = ${raw[column]}`);
      continue;
    }
    if (data[column] !== undefined && data[column] !== null) {
      setClauses.push(`${column} = ?`);
      params.push(data[column]);
    }
  }
  const whereClauses = where.map((w) => w.sql).join(' AND ');
  for (const w of where) params.push(...(w.params || []));
  const sql = `UPDATE ${model.table} SET ${setClauses.join(', ')}${whereClauses ? ` WHERE ${whereClauses}` : ''}`;
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