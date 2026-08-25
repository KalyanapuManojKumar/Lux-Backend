import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Growth Funnel Backend API running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful shutdown handling
const handleShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Gracefully closing server...`);
  server.close(() => {
    logger.info('HTTP server closed successfully. Process exiting.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time. Forcefully terminating.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
