import { Router } from 'express';
import { submitLead } from '../controllers/lead.controller.js';
import { leadRateLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// POST /api/leads - Lead submission endpoint
router.post('/leads', leadRateLimiter, submitLead);

export default router;
