import crypto from 'node:crypto';

/**
 * Generates a cryptographically secure, authoritative event ID for Meta Pixel + CAPI deduplication.
 * Format: evt_<timestamp_ms>_<random_hex>
 */
export const generateEventId = (): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `evt_${timestamp}_${random}`;
};

/**
 * Generates a cryptographically secure unique ID for a lead submission record.
 * Format: lead_<timestamp_ms>_<random_hex>
 */
export const generateLeadId = (): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `lead_${timestamp}_${random}`;
};

/**
 * Generates a cryptographically secure Request ID for request tracking and observability.
 * Format: req_<random_hex>
 */
export const generateRequestId = (): string => {
  const random = crypto.randomBytes(6).toString('hex');
  return `req_${random}`;
};
