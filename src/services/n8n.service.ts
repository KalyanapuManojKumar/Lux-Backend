import axios from 'axios';
import { env } from '../config/env.js';
import { N8nLeadPayload } from '../types/lead.js';
import { createScopedLogger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

export interface SendN8nLeadParams {
  leadPayload: N8nLeadPayload;
  requestId?: string;
}

const n8nHttpClient = axios.create({
  timeout: env.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    ...(env.N8N_WEBHOOK_SECRET ? { 'X-Webhook-Secret': env.N8N_WEBHOOK_SECRET } : {}),
  },
});

/**
 * Sends a validated, enriched lead payload to the n8n automation webhook.
 */
export const sendN8nLead = async (
  params: SendN8nLeadParams,
  client = n8nHttpClient
): Promise<{ success: boolean; data?: unknown }> => {
  const log = createScopedLogger({
    requestId: params.requestId,
    leadId: params.leadPayload.leadId,
    service: 'N8nWebhook',
  });

  try {
    log.info(`Forwarding lead ${params.leadPayload.leadId} to n8n webhook`);

    const response = await withRetry(
      () => client.post(env.N8N_WEBHOOK_URL, params.leadPayload),
      {
        serviceName: 'N8nWebhook',
        requestId: params.requestId,
        maxRetries: 2,
      }
    );

    log.info(`n8n webhook received lead successfully [HTTP ${response.status}]`);
    return { success: true, data: response.data };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      log.error(`n8n webhook failed [HTTP ${error.response?.status || 'ERR'}]: ${error.message}`);
    } else {
      log.error(`n8n webhook error: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
};

// Export wrapper for testing backwards compatibility
export class N8nService {
  constructor(private client = n8nHttpClient) {}
  sendLead = (params: SendN8nLeadParams) => sendN8nLead(params, this.client);
}

export const n8nService = {
  sendLead: sendN8nLead,
};
