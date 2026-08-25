import { describe, it, expect } from 'vitest';
import {
  hashSHA256,
  normalizeEmail,
  normalizePhone,
  normalizeName,
  hashEmail,
  hashPhone,
} from '../../src/utils/hashing.js';

describe('Hashing & Normalization Utilities', () => {
  describe('normalizeEmail & hashEmail', () => {
    it('should trim and lowercase email correctly', () => {
      const raw = '  John.Doe@Example.COM  ';
      const normalized = normalizeEmail(raw);
      expect(normalized).toBe('john.doe@example.com');
    });

    it('should compute SHA-256 hash array for Meta CAPI', () => {
      const email = 'john.doe@example.com';
      const hashed = hashEmail(email);
      expect(hashed).toBeDefined();
      expect(hashed).toHaveLength(1);
      // SHA-256 for 'john.doe@example.com'
      expect(hashed![0]).toBe(hashSHA256(email));
    });

    it('should return undefined for empty or invalid email', () => {
      expect(normalizeEmail('')).toBeUndefined();
      expect(normalizeEmail('   ')).toBeUndefined();
      expect(hashEmail(undefined)).toBeUndefined();
    });
  });

  describe('normalizePhone & hashPhone', () => {
    it('should normalize 10-digit US phone to 11 digits starting with 1', () => {
      const raw = '(555) 123-4567';
      const normalized = normalizePhone(raw);
      expect(normalized).toBe('15551234567');
    });

    it('should strip symbols and keep international country code', () => {
      const raw = '+1 555-123-4567';
      const normalized = normalizePhone(raw);
      expect(normalized).toBe('15551234567');
    });

    it('should return hashed phone array', () => {
      const raw = '+15551234567';
      const hashed = hashPhone(raw);
      expect(hashed).toBeDefined();
      expect(hashed).toHaveLength(1);
      expect(hashed![0]).toBe(hashSHA256('15551234567'));
    });
  });

  describe('normalizeName', () => {
    it('should trim, lowercase, and remove special punctuation', () => {
      const raw = "  Dr. O'Connor, Jr.!  ";
      const normalized = normalizeName(raw);
      expect(normalized).toBe("dr oconnor jr");
    });
  });
});
