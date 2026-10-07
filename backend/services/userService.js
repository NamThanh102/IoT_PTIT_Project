// Tầng nghiệp vụ người dùng & hồ sơ sinh viên
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { buildSelect } from '../utils/queryBuilder.js';
import { notFoundError } from '../utils/ApiError.js';

// Lấy thông tin hồ sơ của sinh viên mặc định
export async function getUserProfile() {
  const { sql, params } = buildSelect(User, {
    where: [{ sql: 'id = ?', params: [env.defaultUserId] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  if (rows.length === 0) {
    throw notFoundError('Chua co thong tin user trong DB');
  }
  return rows[0];
}