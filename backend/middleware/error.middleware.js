/**
 * middleware/error.middleware.js — Xử lý lỗi HTTP tập trung
 *
 * - notFoundHandler: endpoint không tồn tại (sau cùng của router) → 404 JSON
 * - errorHandler: bắt mọi lỗi từ controller; nếu là ApiError thì dùng httpStatus,
 *   lỗi ≥ 500 được log ra console; trả { status: 'error', message } kèm mã HTTP.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    message: `Khong tim thay endpoint ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  const httpStatus = error.httpStatus || 500;
  if (httpStatus >= 500) {
    console.error('[error]', error);
  }
  res.status(httpStatus).json({
    status: 'error',
    message: error.message || 'Loi he thong',
  });
}
