import axios from 'axios';
import { env } from '../config/env.js';
import { META_CONFIG } from '../config/meta.config.js';
import {
  ContactInfo,
  MetaCapiEvent,
  MetaCapiPayload,
  MetaCustomData,
  MetaUserData,
  QualificationStatus,
} from '../types/lead.js';
import { hashEmail, hashName, hashPhone } from '../utils/hashing.js';
import { createScopedLogger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

export interface MetaSendEventParams {
  eventId: string;
  leadId: string;
  contact: ContactInfo;
  qualificationStatus: QualificationStatus;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
  eventSourceUrl?: string;
  requestId?: string;
}

const metaHttpClient = axios.create({
  baseURL: META_CONFIG.GRAPH_API_BASE_URL,
  timeout: env.REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Builds a Meta CAPI event payload with normalized & hashed user data.
 */
export const buildMetaLeadEvent = (params: MetaSendEventParams): MetaCapiEvent => {
  const userData: MetaUserData = {
    em: hashEmail(params.contact.email),
    ph: hashPhone(params.contact.phone),
    fn: hashName(params.contact.firstName),
    ln: hashName(params.contact.lastName),
    // Raw matching fields (MUST NOT be hashed)
    client_ip_address: params.clientIp || undefined,
    client_user_agent: params.userAgent || undefined,
    fbp: params.fbp || undefined,
    fbc: params.fbc || undefined,
  };

  const customData: MetaCustomData = {
    qualification_status: params.qualificationStatus,
    lead_id: params.leadId,
  };

  return {
    event_name: META_CONFIG.EVENT_NAME,
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    action_source: META_CONFIG.ACTION_SOURCE,
    event_source_url: params.eventSourceUrl,
    user_data: userData,
    custom_data: customData,
  };
};

/**
 * Sends a Lead event to Meta Conversions API with bounded retries for transient errors.
 */
export const sendMetaLeadEvent = async (
  params: MetaSendEventParams,
  client = metaHttpClient
): Promise<{ success: boolean; data?: unknown }> => {
  const log = createScopedLogger({
    requestId: params.requestId,
    leadId: params.leadId,
    service: 'MetaCAPI',
  });

  const event = buildMetaLeadEvent(params);
  const payload: MetaCapiPayload = {
    data: [event],
    ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
  };

  const endpoint = `/${env.META_API_VERSION}/${env.META_PIXEL_ID}/events`;

  try {
    log.info(`Sending Meta CAPI Lead event (event_id: ${params.eventId})`);

    const response = await withRetry(
      () =>
        client.post(endpoint, payload, {
          params: {
            access_token: env.META_ACCESS_TOKEN,
          },
        }),
      {
        serviceName: 'MetaCAPI',
        requestId: params.requestId,
        maxRetries: 2,
      }
    );

    log.info(`Meta CAPI event accepted (events_received: ${response.data?.events_received ?? 1})`);
    return { success: true, data: response.data };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      log.error(`Meta CAPI failed [HTTP ${error.response?.status || 'ERR'}]: ${error.message}`);
    } else {
      log.error(`Meta CAPI error: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
};

// Export wrapper class/object for backwards compatibility / testing mocks
export class MetaService {
  constructor(private client = metaHttpClient) {}
  buildLeadEvent = (params: MetaSendEventParams) => buildMetaLeadEvent(params);
  sendLeadEvent = (params: MetaSendEventParams) => sendMetaLeadEvent(params, this.client);
}

export const metaService = {
  buildLeadEvent: buildMetaLeadEvent,
  sendLeadEvent: sendMetaLeadEvent,
};
