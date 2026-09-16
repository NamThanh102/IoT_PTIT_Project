/**
 * routes/api.js — Danh bạ REST API (path → handler controller)
 *
 * Endpoint:
 * - GET  /data/latest     cảm biến mẫu mới nhất
 * - GET  /data/chart      N mẫu gần nhất cho biểu đồ
 * - GET  /data/getall     dữ liệu cảm biến phân trang + lọc (time, name, value)
 * - GET  /device/status   trạng thái hiện tại các thiết bị
 * - POST /device/action   gửi lệnh bật/tắt thiết bị (qua MQTT)
 * - GET  /device/history  lịch sử tác động phân trang + lọc
 * - GET  /profile         thông tin user + 4 link tài liệu
 *
 * Nguyên tắc: file này CHỈ khai báo path, toàn bộ logic nằm ở controllers/.
 */
import { Router } from 'express';
import * as sensorController from '../controllers/sensorController.js';
import * as deviceController from '../controllers/deviceController.js';
import * as profileController from '../controllers/profileController.js';

const router = Router();

// Sensor data
router.get('/data/latest', sensorController.getLatest);
router.get('/data/chart', sensorController.getChart);
router.get('/data/getall', sensorController.getAllData);

// Device control
router.get('/device/status', deviceController.getStatus);
router.post('/device/action', deviceController.postAction);
router.get('/device/history', deviceController.getHistory);

// Profile
router.get('/profile', profileController.getProfile);

export default router;