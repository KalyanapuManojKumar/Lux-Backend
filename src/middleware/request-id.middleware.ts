import { NextFunction, Request, Response } from 'express';
import { generateRequestId } from '../utils/event-id.js';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : generateRequestId();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
