import * as sensorService from '../services/sensorService.js';
import { ok } from '../utils/response.js';

// GET /api/data/latest: Lấy mẫu đo cảm biến mới nhất
export async function getLatest(req, res, next) {
  try {
    const rows = await sensorService.getRecentSamples(1);
    const data = rows.length > 0 ? rows[0] : null;
    return ok(res, { data, message: 'Lay du lieu cam bien moi nhat thanh cong' });
  } catch (error) {
    next(error);
  }
}

// GET /api/data/chart: Lấy N mẫu đo gần nhất cho biểu đồ
export async function getChart(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 20;
    const data = await sensorService.getRecentSamples(limit);
    return ok(res, { data, message: 'Lay du lieu bieu do thanh cong' });
  } catch (error) {
    next(error);
  }
}

// GET /api/data/getall: Lấy tất cả dữ liệu cảm biến có filter+pagination
export async function getAllData(req, res, next) {
  try {
    const { rows, pagination } = await sensorService.queryAllData(req.query);
    if (rows.length === 0 && (req.query.time || req.query.name || req.query.value || req.query.sensorId)) {
      return ok(res, {
        data: [],
        pagination,
        message: 'No matching records found',
      });
    }
    return ok(res, {
      data: rows,
      pagination,
      message: 'Lay du lieu thanh cong',
    });
  } catch (error) {
    next(error);
  }
}