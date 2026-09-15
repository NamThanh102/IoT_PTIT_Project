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
