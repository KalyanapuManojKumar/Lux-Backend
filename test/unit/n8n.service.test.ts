import { describe, it, expect, vi } from 'vitest';
import { sendN8nLead } from '../../src/services/n8n.service.js';
import axios from 'axios';

describe('N8nService', () => {
  it('should successfully send lead payload to n8n webhook', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      status: 200,
      data: { status: 'received' },
    });

    const mockAxiosInstance = {
      post: mockPost,
    } as unknown as typeof axios;

    const result = await sendN8nLead(
      {
        leadPayload: {
          leadId: 'lead_123',
          eventId: 'evt_123',
          contact: {
            firstName: 'Alice',
            lastName: 'Walker',
            email: 'alice@example.com',
            phone: '+15550001111',
          },
          qualification: {
            status: 'qualified',
            reason: 'Meets criteria',
          },
          answers: { age: 35 },
          attribution: { utmSource: 'facebook' },
          metadata: { clientIp: '127.0.0.1' },
          createdAt: new Date().toISOString(),
        },
        requestId: 'req_n8n_test',
      },
      mockAxiosInstance as any
    );

    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
