import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { env } from './config/env.js';
import { connectMqtt } from './config/mqtt.js';
import * as sensorService from './services/sensorService.js';
import * as deviceService from './services/deviceService.js';
import { notFoundHandler, errorHandler } from './middleware/error.middleware.js';

connectMqtt({
  sensorData: sensorService.saveSensorSample,
  deviceResponse: deviceService.handleDeviceResponse,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'success', message: 'IoT Backend running', uptime: process.uptime() });
});

app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`[server] RESTful API dang chay tai http://localhost:${env.port}/api`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[server] Nhan ${signal}, dang tat...`);
    server.close(() => process.exit(0));
  });
}