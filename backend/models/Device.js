/**
 * models/Device.js — Mô tả bảng devices
 * Cột: id (chuỗi 10 ký tự), name (LED_1/LED_2 — dùng làm định danh), created_at.
 * Được queryBuilder dùng để sinh SQL.
 */
export const Device = {
  table: 'devices',
  primaryKey: 'id',
  columns: ['id', 'name', 'created_at'],
};
