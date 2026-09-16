/**
 * utils/ApiError.js — Định nghĩa lỗi kèm mã HTTP để error handler xử lý tập trung
 *
 * Export:
 * - ApiError: lớp lỗi cơ sở (httpStatus + message)
 * - badRequest(message)   → 400
 * - notFoundError(message) → 404
 *
 * Cách dùng: controller `throw badRequest('...')` → middleware/error.middleware.js
 * bắt và trả JSON { status: 'error', message }.
 */
export class ApiError extends Error {
  constructor(httpStatus, message) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

export function badRequest(message) {
  return new ApiError(400, message);
}

export function notFoundError(message = 'Khong tim thay du lieu') {
  return new ApiError(404, message);
}
