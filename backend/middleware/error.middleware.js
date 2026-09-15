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
