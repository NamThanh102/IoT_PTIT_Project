// config/db.js — Pool kết nối MySQL (mysql2/promise)
import mysql from 'mysql2/promise';
import { env } from './env.js';

// Khởi tạo Connection Pool kết nối tới cơ sở dữ liệu MySQL
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
