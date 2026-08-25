import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface ApiErrorOptions {
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message || 'An unexpected error occurred');
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_SERVER_ERROR';
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 404 Not Found Middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested resource '${req.method} ${req.originalUrl}' was not found`,
    },
    requestId: String(req.id || 'unknown'),
  });
};

/**
 * Centralized Error Handling Middleware
 */
export const errorHandler = (
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = String(req.id || 'unknown');

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    logger.warn({ requestId }, `Validation failed on ${req.method} ${req.originalUrl} - ${issues}`);

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid lead data',
        ...(env.NODE_ENV === 'development'
          ? { details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })) }
          : {}),
      },
      requestId,
    });
    return;
  }

  // Handle Custom ApiError
  if (err instanceof ApiError) {
    logger.warn({ requestId }, `API Error [HTTP ${err.statusCode} - ${err.code}]: ${err.message}`);

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(env.NODE_ENV === 'development' && err.details ? { details: err.details } : {}),
      },
      requestId,
    });
    return;
  }

  // Handle unexpected generic errors
  logger.error({ requestId }, `Unhandled server error: ${err.message}`);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
    requestId,
  });
};
