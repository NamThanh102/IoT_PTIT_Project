// Tầng nghiệp vụ người dùng & hồ sơ sinh viên
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { buildSelect } from '../utils/queryBuilder.js';
import { notFoundError } from '../utils/ApiError.js';

// Tìm thông tin người dùng trong DB theo ID
async function findUserById(id) {
  const { sql, params } = buildSelect(User, {
    where: [{ sql: 'id = ?', params: [id] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Lấy thông tin hồ sơ của sinh viên mặc định
export async function getUserProfile() {
  const user = await findUserById(env.defaultUserId);
  if (!user) {
    throw notFoundError('Chua co thong tin user trong DB');
  }
  return user;
}
