import express, { Express } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import healthRoutes from './routes/health.routes.js';
import leadRoutes from './routes/lead.routes.js';
import { logger } from './utils/logger.js';

export const createApp = (): Express => {
  const app = express();

  // Trust proxy for secure IP handling
  app.set('trust proxy', 1);

  // 1. Request ID Middleware
  app.use(requestIdMiddleware);

  // 2. Clean Single-Line Request Logger
  if (env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const reqId = req.id || 'unknown';
        logger.info(`[${reqId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  // 3. CORS Configuration
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Idempotency-Key', 'X-Webhook-Secret'],
      credentials: true,
    })
  );

  // 4. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 5. Routes
  app.use('/api', healthRoutes);
  app.use('/api', leadRoutes);

  // 6. 404 Handler
  app.use(notFoundHandler);

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp();
