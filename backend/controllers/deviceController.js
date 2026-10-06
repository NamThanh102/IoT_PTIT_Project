import * as deviceService from '../services/deviceService.js';
import { ok } from '../utils/response.js';

export const handleDeviceResponse = deviceService.handleDeviceResponse;
export const getDeviceStatus = deviceService.getDeviceStatus;

// GET /api/device/status: Lấy trạng thái hoạt động hiện tại của tất cả đèn LED
export async function getStatus(req, res, next) {
  try {
    const data = await deviceService.getDeviceStatus();
    return ok(res, { data, message: 'Lay trang thai thiet bi thanh cong' });
  } catch (error) {
    next(error);
  }
}

// POST /api/device/action: Gửi lệnh bật/tắt thiết bị (trả về HTTP 202 Accepted)
export async function postAction(req, res, next) {
  try {
    const { device_id, action } = req.body || {};
    const result = await deviceService.sendAction({ deviceId: device_id, action });
    return ok(res, {
      data: result,
      message: 'Lenh dang duoc xu ly',
      httpStatus: 202,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/device/history: Lấy danh sách lịch sử bật/tắt thiết bị (phân trang + lọc)
export async function getHistory(req, res, next) {
  try {
    const { rows, total, page, limit } = await deviceService.queryHistory(req.query);
    return ok(res, {
      data: rows,
      pagination: {
        current_page: page,
        total_pages: Math.max(1, Math.ceil(total / limit)),
        total_records: total,
      },
      message: 'Lay lich su thao tac thanh cong',
    });
  } catch (error) {
    next(error);
  }
}