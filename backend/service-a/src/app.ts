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
import demandRoutes from './routes/demand-routes.js';
import orderRoutes from './routes/order-routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trim()) } }));
app.use(generalLimiter);

app.use('/api/demands', demandRoutes);
app.use('/api/orders', orderRoutes);

app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '请求的资源不存在', data: null });
});

app.use(errorHandler);

const PORT = parseInt(process.env.SERVICE_A_PORT || '3001', 10);

app.listen(PORT, () => {
  logger.info(`CampusHub Service A (demand + order) running on port ${PORT}`);
});

export default app;
