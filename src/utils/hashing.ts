import crypto from 'node:crypto';

/**
 * Computes a SHA-256 hash formatted as a hex string.
 * Returns undefined if value is empty/null/undefined.
 */
export const hashSHA256 = (value: string | undefined | null): string | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return crypto.createHash('sha256').update(trimmed).digest('hex');
};

/**
 * Normalizes email according to Meta CAPI specification:
 * 1. Trim leading and trailing whitespace
 * 2. Convert all characters to lowercase
 */
export const normalizeEmail = (email: string | undefined | null): string | undefined => {
  if (!email || typeof email !== 'string') {
    return undefined;
  }
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
};

/**
 * Normalizes phone number according to Meta CAPI specification:
 * 1. Remove all non-numeric characters (except leading '+' which may indicate country code)
 * 2. Remove leading zeros
 * 3. Ensure country code exists (defaults to +1 for 10-digit North American numbers if absent)
 */
export const normalizePhone = (phone: string | undefined | null): string | undefined => {
  if (!phone || typeof phone !== 'string') {
    return undefined;
  }
  // Strip all non-digit characters except leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');

  // If 10 digits (standard US/Canada without country code), prepend 1
  if (cleaned.length === 10) {
    cleaned = `1${cleaned}`;
  }

  return cleaned.length >= 7 ? cleaned : undefined;
};

/**
 * Normalizes name (first or last) according to Meta CAPI specification:
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Remove punctuation / special characters
 */
export const normalizeName = (name: string | undefined | null): string | undefined => {
  if (!name || typeof name !== 'string') {
    return undefined;
  }
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Keep only letters, digits, and spaces
    .replace(/\s+/g, ' ') // Collapse multiple whitespace to single space
    .trim();
  return normalized.length > 0 ? normalized : undefined;
};

/**
 * Convenience helper to normalize and hash an email for Meta CAPI user_data.
 */
export const hashEmail = (email: string | undefined | null): string[] | undefined => {
  const normalized = normalizeEmail(email);
  const hash = hashSHA256(normalized);
  return hash ? [hash] : undefined;
};

/**
 * Convenience helper to normalize and hash a phone number for Meta CAPI user_data.
 */
export const hashPhone = (phone: string | undefined | null): string[] | undefined => {
  const normalized = normalizePhone(phone);
  const hash = hashSHA256(normalized);
  return hash ? [hash] : undefined;
};

/**
 * Convenience helper to normalize and hash a name for Meta CAPI user_data.
 */
export const hashName = (name: string | undefined | null): string[] | undefined => {
  const normalized = normalizeName(name);
  const hash = hashSHA256(normalized);
  return hash ? [hash] : undefined;
};
