// Lớp lỗi tùy chỉnh cho API kèm mã trạng thái HTTP
export class ApiError extends Error {
  constructor(httpStatus, message) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

// Tạo nhanh lỗi 400 Bad Request
export function badRequest(message) {
  return new ApiError(400, message);
}

// Tạo nhanh lỗi 404 Not Found
export function notFoundError(message = 'Khong tim thay du lieu') {
  return new ApiError(404, message);
}
