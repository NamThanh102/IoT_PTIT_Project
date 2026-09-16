/**
 * models/Action.js — Mô tả bảng action (lịch sử tác động thiết bị)
 * Cột: id (chuỗi 10 ký tự), userID, deviceID, action (ON/OFF), status (LOADING/ON/OFF/FAILED), created_at.
 * Được queryBuilder dùng để sinh SQL.
 */
export const Action = {
  table: 'action',
  primaryKey: 'id',
  columns: ['id', 'userID', 'deviceID', 'action', 'status', 'created_at'],
};
