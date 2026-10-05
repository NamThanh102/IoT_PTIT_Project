// utils/response.js — Format response JSON chuẩn cho mọi endpoint
export function ok(res, { data = null, message = 'Thanh cong', pagination = undefined, httpStatus = 200 } = {}) {
  const body = { status: 'success', message, data };
  if (pagination) {
    body.pagination = pagination;
  }
  return res.status(httpStatus).json(body);
}
