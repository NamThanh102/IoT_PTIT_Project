import { Router } from 'express';
import * as sensorController from '../controllers/sensorController.js';
import * as deviceController from '../controllers/deviceController.js';
import * as profileController from '../controllers/profileController.js';

const router = Router();

// --- 1. Nhóm API dữ liệu cảm biến (Sensor Data) ---
router.get('/data/latest', sensorController.getLatest); // Lấy mẫu dữ liệu cảm biến mới nhất (Dashboard)
router.get('/data/chart', sensorController.getChart);   // Lấy dữ liệu gần đây để vẽ biểu đồ realtime
router.get('/data/getall', sensorController.getAllData); // Lấy danh sách cảm biến (hỗ trợ lọc, phân trang, sắp xếp)

// --- 2. Nhóm API điều khiển & Lịch sử thiết bị (Device Control & History) ---
router.get('/device/status', deviceController.getStatus);   // Lấy trạng thái hiện tại của tất cả thiết bị
router.post('/device/action', deviceController.postAction); // Gửi lệnh bật/tắt thiết bị qua MQTT
router.get('/device/history', deviceController.getHistory); // Lấy lịch sử thao tác thiết bị (lọc, phân trang)

// --- 3. Nhóm API thông tin cá nhân (Profile) ---
router.get('/profile', profileController.getProfile);       // Lấy thông tin cá nhân sinh viên

export default router;