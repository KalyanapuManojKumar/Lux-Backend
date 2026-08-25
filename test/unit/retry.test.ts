import { describe, it, expect, vi } from 'vitest';
import { isTransientError, withRetry } from '../../src/utils/retry.js';
import { AxiosError, AxiosHeaders } from 'axios';

describe('Retry Utility', () => {
  describe('isTransientError', () => {
    it('should identify 500, 502, 503, 504 and 429 as transient', () => {
      const createAxiosErrorWithStatus = (status: number) => {
        const error = new AxiosError('Error message');
        error.response = {
          status,
          statusText: 'Error',
          data: {},
          headers: {},
          config: { headers: new AxiosHeaders() },
        };
        return error;
      };

      expect(isTransientError(createAxiosErrorWithStatus(500))).toBe(true);
      expect(isTransientError(createAxiosErrorWithStatus(502))).toBe(true);
      expect(isTransientError(createAxiosErrorWithStatus(503))).toBe(true);
      expect(isTransientError(createAxiosErrorWithStatus(429))).toBe(true);
    });

    it('should NOT identify 400, 401, 403, 404 as transient', () => {
      const createAxiosErrorWithStatus = (status: number) => {
        const error = new AxiosError('Client Error');
        error.response = {
          status,
          statusText: 'Client Error',
          data: {},
          headers: {},
          config: { headers: new AxiosHeaders() },
        };
        return error;
      };

      expect(isTransientError(createAxiosErrorWithStatus(400))).toBe(false);
      expect(isTransientError(createAxiosErrorWithStatus(401))).toBe(false);
      expect(isTransientError(createAxiosErrorWithStatus(403))).toBe(false);
      expect(isTransientError(createAxiosErrorWithStatus(404))).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should resolve immediately on success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(mockFn);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient error and succeed', async () => {
      const transientErr = new AxiosError('Server error');
      transientErr.response = {
        status: 503,
        statusText: 'Service Unavailable',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(transientErr)
        .mockResolvedValueOnce('recovered');

      const result = await withRetry(mockFn, { initialDelayMs: 10, maxRetries: 2 });
      expect(result).toBe('recovered');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail immediately without retry on non-transient 400 error', async () => {
      const clientErr = new AxiosError('Bad Request');
      clientErr.response = {
        status: 400,
        statusText: 'Bad Request',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      const mockFn = vi.fn().mockRejectedValue(clientErr);

      await expect(withRetry(mockFn, { initialDelayMs: 10, maxRetries: 2 })).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
