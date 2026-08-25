import { AxiosError } from 'axios';
import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  serviceName?: string;
  requestId?: string;
}

/**
 * Checks whether an error is transient and safe to retry.
 * Returns true for timeouts, network resets/aborts, and HTTP 5xx responses.
 * Returns false for HTTP 4xx (client errors, authentication errors, bad payloads).
 */
export const isTransientError = (error: unknown): boolean => {
  if (error instanceof AxiosError) {
    // If response was received:
    if (error.response) {
      const status = error.response.status;
      // Retry 5xx server errors (500, 502, 503, 504) and 429 rate limit
      return status === 429 || status >= 500;
    }
    // Network errors without response (ETIMEDOUT, ECONNRESET, ENOTFOUND, timeout)
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return true;
    }
    if (!error.response && error.request) {
      // Request was made but no response was received
      return true;
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('network')) {
      return true;
    }
  }

  return false;
};

/**
 * Executes an async operation with bounded retries and exponential backoff.
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const maxRetries = options.maxRetries ?? 2; // e.g. 1 initial attempt + 2 retries = 3 total max
  const initialDelayMs = options.initialDelayMs ?? 300;
  const backoffFactor = options.backoffFactor ?? 2;
  const serviceName = options.serviceName ?? 'DownstreamService';
  const requestId = options.requestId ?? 'unknown';

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    attempt++;
    try {
      return await operation();
    } catch (error: unknown) {
      const canRetry = isTransientError(error);

      if (!canRetry || attempt > maxRetries) {
        throw error;
      }

      logger.warn(
        { requestId },
        `[${serviceName}] Transient error on attempt ${attempt}/${maxRetries} (${error instanceof Error ? error.message : String(error)}). Retrying in ${delay}ms...`
      );

      // Add a small jitter (±20%)
      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      const actualDelay = Math.max(50, Math.floor(delay + jitter));

      await new Promise((resolve) => setTimeout(resolve, actualDelay));
      delay *= backoffFactor;
    }
  }
};
