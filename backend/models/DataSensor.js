/**
 * models/DataSensor.js — Mô tả bảng datasensors (mẫu đọc cảm biến)
 * Cột: id (chuỗi 10 ký tự), sensorID, value, created_at.
 * Được queryBuilder dùng để sinh SQL.
 */
export const DataSensor = {
  table: 'datasensors',
  primaryKey: 'id',
  columns: ['id', 'sensorID', 'value', 'created_at'],
};
