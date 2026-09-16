/**
 * models/Sensor.js — Mô tả bảng sensors
 * Cột: id (chuỗi 10 ký tự), name (Temperature/Humidity/Light — dùng làm định danh), created_at.
 * Được queryBuilder dùng để sinh SQL.
 */
export const Sensor = {
  table: 'sensors',
  primaryKey: 'id',
  columns: ['id', 'name', 'created_at'],
};
