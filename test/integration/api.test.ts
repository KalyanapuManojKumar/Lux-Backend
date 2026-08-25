import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { metaService } from '../../src/services/meta.service.js';
import { n8nService } from '../../src/services/n8n.service.js';

describe('Growth Funnel Backend API Endpoints', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = createApp();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK with service metadata', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'growth-funnel-api');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.headers).toHaveProperty('x-request-id');
    });
  });

  describe('POST /api/leads', () => {
    const validLeadPayload = {
      contact: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+15551234567',
      },
      answers: {
        age: 42,
        employmentStatus: 'unemployed',
        receivingBenefits: 'no',
        conditionDuration: '12_months_or_longer',
      },
      attribution: {
        fbclid: 'IwAR123456789abcdef',
        utmSource: 'facebook',
        utmMedium: 'paid_social',
        utmCampaign: 'disability_campaign_2026',
      },
      tracking: {
        fbp: 'fb.1.1724567890.123456789',
      },
    };

    it('should successfully ingest lead and return leadId and eventId', async () => {
      // Mock successful downstream calls
      vi.spyOn(metaService, 'sendLeadEvent').mockResolvedValue({ success: true });
      vi.spyOn(n8nService, 'sendLead').mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/leads')
        .send(validLeadPayload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.leadId).toMatch(/^lead_\d+_[a-f0-9]+$/);
      expect(response.body.eventId).toMatch(/^evt_\d+_[a-f0-9]+$/);
      expect(response.body.qualification.status).toBe('qualified');
      expect(response.body.tracking).toEqual({
        meta: 'accepted',
        automation: 'accepted',
      });
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should reject invalid email format with 400 VALIDATION_ERROR', async () => {
      const invalidPayload = {
        ...validLeadPayload,
        contact: {
          ...validLeadPayload.contact,
          email: 'not-an-email',
        },
      };

      const response = await request(app)
        .post('/api/leads')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid lead data');
    });

    it('should reject missing required field with 400 VALIDATION_ERROR', async () => {
      const missingPayload = {
        contact: {
          firstName: 'John',
          // missing lastName, email, phone
        },
        answers: {},
      };

      const response = await request(app)
        .post('/api/leads')
        .send(missingPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle partial failure gracefully if Meta fails but n8n succeeds', async () => {
      // Meta fails, n8n succeeds
      vi.spyOn(metaService, 'sendLeadEvent').mockRejectedValue(new Error('Meta Graph API 500 error'));
      vi.spyOn(n8nService, 'sendLead').mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/leads')
        .send({
          ...validLeadPayload,
          contact: {
            ...validLeadPayload.contact,
            email: 'partial.success@example.com',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.tracking).toEqual({
        meta: 'failed',
        automation: 'accepted',
      });
    });

    it('should handle duplicate submission via idempotency cache', async () => {
      vi.spyOn(metaService, 'sendLeadEvent').mockResolvedValue({ success: true });
      vi.spyOn(n8nService, 'sendLead').mockResolvedValue({ success: true });

      const uniquePayload = {
        ...validLeadPayload,
        contact: {
          ...validLeadPayload.contact,
          email: 'idempotent.user@example.com',
          phone: '+15559998888',
        },
      };

      // First submission
      const firstResponse = await request(app)
        .post('/api/leads')
        .send(uniquePayload);

      expect(firstResponse.status).toBe(201);
      const originalLeadId = firstResponse.body.leadId;
      const originalEventId = firstResponse.body.eventId;

      // Duplicate submission (same payload immediately after)
      const secondResponse = await request(app)
        .post('/api/leads')
        .send(uniquePayload);

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.leadId).toBe(originalLeadId);
      expect(secondResponse.body.eventId).toBe(originalEventId);
      expect(secondResponse.body.message).toContain('Duplicate submission recognized');
    });
  });

  describe('404 Route Handling', () => {
    it('should return consistent JSON 404 for unknown endpoints', async () => {
      const response = await request(app).get('/api/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
