import {
  ContactInfo,
  DeliveryStatus,
  LeadResponse,
  N8nLeadPayload,
  QualificationResult,
} from '../types/lead.js';
import { normalizeAttribution } from '../utils/attribution.js';
import { generateEventId, generateLeadId } from '../utils/event-id.js';
import { hashSHA256, normalizeEmail, normalizeName, normalizePhone } from '../utils/hashing.js';
import { createScopedLogger } from '../utils/logger.js';
import { metaService } from './meta.service.js';
import { n8nService } from './n8n.service.js';
import { evaluateQualification } from './qualification.service.js';
import { ValidatedLeadSubmission } from '../schemas/lead.schema.js';

interface CachedSubmission {
  response: LeadResponse;
  timestamp: number;
}

export interface ProcessLeadContext {
  clientIp?: string;
  userAgent?: string;
  referrer?: string;
  origin?: string;
  requestId: string;
  idempotencyKey?: string;
}

// In-memory idempotency cache (5 minute TTL)
const idempotencyCache = new Map<string, CachedSubmission>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, item] of idempotencyCache.entries()) {
    if (now - item.timestamp > CACHE_TTL_MS) {
      idempotencyCache.delete(key);
    }
  }
};

const generateDeduplicationKey = (submission: ValidatedLeadSubmission, explicitKey?: string): string => {
  if (explicitKey && explicitKey.trim().length > 0) {
    return `key_${explicitKey.trim()}`;
  }
  const normEmail = normalizeEmail(submission.contact.email) || '';
  const normPhone = normalizePhone(submission.contact.phone) || '';
  return `hash_${hashSHA256(`${normEmail}:${normPhone}`)}`;
};

const normalizeContactInfo = (contact: ValidatedLeadSubmission['contact']): ContactInfo => {
  return {
    firstName: normalizeName(contact.firstName) || contact.firstName.trim(),
    lastName: normalizeName(contact.lastName) || contact.lastName.trim(),
    email: normalizeEmail(contact.email) || contact.email.trim().toLowerCase(),
    phone: normalizePhone(contact.phone) || contact.phone.trim(),
  };
};

/**
 * Orchestrates the full lead submission lifecycle:
 * 1. Checks idempotency cache to prevent rapid duplicate submissions
 * 2. Normalizes contact and marketing attribution
 * 3. Generates authoritative event_id and lead_id
 * 4. Runs deterministic qualification rules
 * 5. Concurrently dispatches Meta CAPI and n8n webhook via Promise.allSettled
 * 6. Returns structured response with delivery statuses
 */
export const processLead = async (
  submission: ValidatedLeadSubmission,
  context: ProcessLeadContext
): Promise<LeadResponse> => {
  const log = createScopedLogger({
    requestId: context.requestId,
    service: 'LeadService',
  });

  // 1. Idempotency Check
  cleanExpiredCache();
  const dedupKey = generateDeduplicationKey(submission, context.idempotencyKey);
  const cached = idempotencyCache.get(dedupKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    log.warn(`Duplicate submission detected (lead_id: ${cached.response.leadId}) - returning cached response`);
    return {
      ...cached.response,
      message: 'Duplicate submission recognized. Lead previously recorded.',
    };
  }

  // 2. Generate Authoritative IDs
  const leadId = generateLeadId();
  const eventId = generateEventId();
  const logWithIds = createScopedLogger({
    requestId: context.requestId,
    leadId,
    service: 'LeadService',
  });

  // 3. Normalize Data
  const normalizedContact = normalizeContactInfo(submission.contact);
  const normalizedAttribution = normalizeAttribution(submission.attribution, submission.tracking);

  // 4. Evaluate Qualification
  const qualification: QualificationResult = evaluateQualification(submission.answers);
  logWithIds.info(`Lead qualified as: ${qualification.status} (${qualification.reason})`);

  // 5. Build Downstream Payloads
  const metaPromise = metaService.sendLeadEvent({
    eventId,
    leadId,
    contact: normalizedContact,
    qualificationStatus: qualification.status,
    fbp: normalizedAttribution.fbp,
    fbc: normalizedAttribution.fbc,
    clientIp: context.clientIp,
    userAgent: context.userAgent,
    eventSourceUrl: context.origin || context.referrer,
    requestId: context.requestId,
  });

  const n8nPayload: N8nLeadPayload = {
    leadId,
    eventId,
    contact: normalizedContact,
    qualification,
    answers: submission.answers,
    attribution: normalizedAttribution,
    metadata: {
      clientIp: context.clientIp,
      userAgent: context.userAgent,
      referrer: context.referrer,
      origin: context.origin,
    },
    createdAt: new Date().toISOString(),
  };

  const n8nPromise = n8nService.sendLead({
    leadPayload: n8nPayload,
    requestId: context.requestId,
  });

  // 6. Concurrently Dispatch Downstream Systems
  const [metaResult, n8nResult] = await Promise.allSettled([metaPromise, n8nPromise]);

  const metaStatus: DeliveryStatus = metaResult.status === 'fulfilled' ? 'accepted' : 'failed';
  const n8nStatus: DeliveryStatus = n8nResult.status === 'fulfilled' ? 'accepted' : 'failed';

  if (metaResult.status === 'rejected') {
    logWithIds.error(`Meta delivery failed: ${metaResult.reason instanceof Error ? metaResult.reason.message : String(metaResult.reason)}`);
  }

  if (n8nResult.status === 'rejected') {
    logWithIds.error(`n8n delivery failed: ${n8nResult.reason instanceof Error ? n8nResult.reason.message : String(n8nResult.reason)}`);
  }

  // 7. Formulate Final Response
  const response: LeadResponse = {
    success: true,
    leadId,
    eventId,
    qualification: {
      status: qualification.status,
      reason: qualification.reason,
    },
    tracking: {
      meta: metaStatus,
      automation: n8nStatus,
    },
  };

  // 8. Save in Idempotency Cache
  idempotencyCache.set(dedupKey, {
    response,
    timestamp: Date.now(),
  });

  logWithIds.info(`Lead processed successfully (meta: ${metaStatus}, n8n: ${n8nStatus})`);
  return response;
};

export const leadService = {
  processLead,
};
