/**
 * config/db.js — Pool kết nối MySQL (mysql2/promise)
 *
 * Tính năng:
 * - Tái sử dụng kết nối, giới hạn connectionLimit lấy từ env
 * - dateStrings: true → cột DATETIME trả về chuỗi 'YYYY-MM-DD HH:MM:SS'
 * - namedPlaceholders: true → hỗ trợ tham số dạng :name trong SQL
 *
 * Cách dùng: controller `import { pool } from '../config/db.js'` rồi pool.query().
 */
import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  dateStrings: true,
  namedPlaceholders: true,
});
