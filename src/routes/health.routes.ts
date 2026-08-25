import { Router, Request, Response } from 'express';

const router = Router();

// GET /api/health - Lightweight liveness probe
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'growth-funnel-api',
    uptime: Math.floor(process.uptime()),
  });
});

export default router;
