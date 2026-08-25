import { describe, it, expect, vi } from 'vitest';
import { buildMetaLeadEvent, sendMetaLeadEvent } from '../../src/services/meta.service.js';
import axios from 'axios';
import { hashSHA256 } from '../../src/utils/hashing.js';

describe('MetaService', () => {
  it('should build a valid Meta CAPI event payload with properly hashed user_data', () => {
    const event = buildMetaLeadEvent({
      eventId: 'evt_12345_abc',
      leadId: 'lead_12345_abc',
      contact: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+15551234567',
      },
      qualificationStatus: 'qualified',
      fbp: 'fb.1.1234567890.12345',
      fbc: 'fb.1.1234567890.IwAR123',
      clientIp: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test Browser',
      requestId: 'req_test',
    });

    expect(event.event_name).toBe('Lead');
    expect(event.event_id).toBe('evt_12345_abc');
    expect(event.action_source).toBe('website');

    // Verify Hashing
    expect(event.user_data.em).toEqual([hashSHA256('john.doe@example.com')]);
    expect(event.user_data.ph).toEqual([hashSHA256('15551234567')]);
    expect(event.user_data.fn).toEqual([hashSHA256('john')]);
    expect(event.user_data.ln).toEqual([hashSHA256('doe')]);

    // Verify Raw Matching Parameters are NOT hashed
    expect(event.user_data.client_ip_address).toBe('192.168.1.1');
    expect(event.user_data.client_user_agent).toBe('Mozilla/5.0 Test Browser');
    expect(event.user_data.fbp).toBe('fb.1.1234567890.12345');
    expect(event.user_data.fbc).toBe('fb.1.1234567890.IwAR123');

    // Verify Custom Data
    expect(event.custom_data?.qualification_status).toBe('qualified');
    expect(event.custom_data?.lead_id).toBe('lead_12345_abc');
  });

  it('should successfully send event through axios client', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        events_received: 1,
        fbtrace_id: 'test_trace_123',
      },
    });

    const mockAxiosInstance = {
      post: mockPost,
    } as unknown as typeof axios;

    const result = await sendMetaLeadEvent(
      {
        eventId: 'evt_test_1',
        leadId: 'lead_test_1',
        contact: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '5559876543',
        },
        qualificationStatus: 'qualified',
        requestId: 'req_123',
      },
      mockAxiosInstance as any
    );

    expect(result.success).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
