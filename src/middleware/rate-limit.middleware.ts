import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { Request, Response } from 'express';

export const leadRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many submissions from this IP address. Please wait a moment before trying again.',
      },
      requestId: String(req.id || 'unknown'),
    });
  },
});
