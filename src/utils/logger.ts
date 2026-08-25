import { env } from '../config/env.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Formats and prints a clean, human-readable single-line log to console.
 */
const printLog = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
  if (env.NODE_ENV === 'test') {
    return; // Keep test output clean
  }

  const timestamp = new Date().toLocaleTimeString();
  const levelTag = `[${level.toUpperCase()}]`.padEnd(7);
  const reqTag = context?.requestId ? `[${context.requestId}] ` : '';
  const serviceTag = context?.service ? `[${context.service}] ` : '';

  console.log(`${timestamp} ${levelTag} ${reqTag}${serviceTag}${message}`);
};

export const logger = {
  info: (msgOrCtx: string | Record<string, unknown>, msg?: string) => {
    if (typeof msgOrCtx === 'string') {
      printLog('info', msgOrCtx);
    } else {
      printLog('info', msg || '', msgOrCtx);
    }
  },
  warn: (msgOrCtx: string | Record<string, unknown>, msg?: string) => {
    if (typeof msgOrCtx === 'string') {
      printLog('warn', msgOrCtx);
    } else {
      printLog('warn', msg || '', msgOrCtx);
    }
  },
  error: (msgOrCtx: string | Record<string, unknown>, msg?: string) => {
    if (typeof msgOrCtx === 'string') {
      printLog('error', msgOrCtx);
    } else {
      printLog('error', msg || '', msgOrCtx);
    }
  },
  debug: (msgOrCtx: string | Record<string, unknown>, msg?: string) => {
    if (typeof msgOrCtx === 'string') {
      printLog('debug', msgOrCtx);
    } else {
      printLog('debug', msg || '', msgOrCtx);
    }
  },
};

export const createScopedLogger = (baseContext: { requestId?: string; leadId?: string; service?: string }) => {
  return {
    info: (message: string) => {
      printLog('info', message, baseContext);
    },
    warn: (message: string) => {
      printLog('warn', message, baseContext);
    },
    error: (message: string) => {
      printLog('error', message, baseContext);
    },
  };
};
