/**
 * models/User.js — Mô tả bảng users
 * Cột: id (chuỗi 10 ký tự), name, msv, github_link, figma_link, apidocs_link, baocao_link.
 * Được queryBuilder dùng để sinh SQL (INSERT/SELECT).
 */
export const User = {
  table: 'users',
  primaryKey: 'id',
  columns: ['id', 'name', 'msv', 'github_link', 'figma_link', 'apidocs_link', 'baocao_link'],
};
