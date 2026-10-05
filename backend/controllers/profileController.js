import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { buildSelect } from '../utils/queryBuilder.js';
import { ok } from '../utils/response.js';
import { notFoundError } from '../utils/ApiError.js';

// Tìm thông tin người dùng trong cơ sở dữ liệu theo ID
async function findUserById(id) {
  const { sql, params } = buildSelect(User, {
    where: [{ sql: 'id = ?', params: [id] }],
    limit: 1,
  });
  const [rows] = await pool.query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function getProfile(req, res, next) {
  try {
    const data = await findUserById(env.defaultUserId);
    if (!data) {
      throw notFoundError('Chua co thong tin user trong DB');
    }
    return ok(res, { data, message: 'Lay thong tin profile thanh cong' });
  } catch (error) {
    return next(error);
  }
}