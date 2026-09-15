import { Router } from 'express';
import * as sensorController from '../controllers/sensorController.js';
import * as deviceController from '../controllers/deviceController.js';
import * as profileController from '../controllers/profileController.js';

const router = Router();

// Dashboard (combined)
router.get('/dashboard', sensorController.getDashboard);

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