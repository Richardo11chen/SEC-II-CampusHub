import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler, generalLimiter, logger } from '@campushub/shared';
import authRoutes from './routes/auth-routes.js';
import userRoutes from './routes/user-routes.js';
import uploadRoutes from './routes/upload-routes.js';
import reviewRoutes from './routes/review-routes.js';
import notificationRoutes from './routes/notification-routes.js';
import adminRoutes from './routes/admin-routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(UPLOAD_DIR));

app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '请求的资源不存在', data: null });
});

app.use(errorHandler);

const PORT = parseInt(process.env.SERVICE_B_PORT || '3002', 10);

app.listen(PORT, () => {
  logger.info(`CampusHub Service B (auth + user + upload) running on port ${PORT}`);
});

export default app;
