import { NextFunction, Request, Response } from 'express';
import { leadSubmissionSchema } from '../schemas/lead.schema.js';
import { processLead } from '../services/lead.service.js';

/**
 * POST /api/leads
 * Validates request payload and delegates lead processing.
 */
export const submitLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Strict input validation
    const validatedPayload = leadSubmissionSchema.parse(req.body);

    // 2. Extract client network metadata
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const clientIp = rawIp.split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || undefined;
    const referrer = req.headers['referer'] as string | undefined;
    const origin = req.headers['origin'] as string | undefined;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // 3. Process lead
    const result = await processLead(validatedPayload, {
      clientIp,
      userAgent,
      referrer,
      origin,
      requestId: String(req.id || 'unknown'),
      idempotencyKey,
    });

    // 4. Return HTTP 201 Created
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Export wrapper for backwards compatibility
export const LeadController = {
  submitLead,
};
