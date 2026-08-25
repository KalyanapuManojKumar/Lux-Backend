import { describe, it, expect } from 'vitest';
import {
  buildFbcFromFbclid,
  normalizeAttribution,
  normalizeFbc,
  normalizeFbp,
} from '../../src/utils/attribution.js';

describe('Attribution & Tracking Utilities', () => {
  it('should build standard Meta fbc string from fbclid', () => {
    const fbclid = 'IwAR123456789abcdef';
    const timestamp = 1724567890000;
    const fbc = buildFbcFromFbclid(fbclid, timestamp);

    expect(fbc).toBe(`fb.1.${timestamp}.${fbclid}`);
  });

  it('should validate and preserve existing fbc if formatted correctly', () => {
    const existingFbc = 'fb.1.1724567890000.IwAR_test';
    const normalized = normalizeFbc(existingFbc);
    expect(normalized).toBe(existingFbc);
  });

  it('should fallback to building fbc if fbc is invalid but fbclid exists', () => {
    const invalidFbc = 'malformed_cookie';
    const fbclid = 'valid_fbclid_123';
    const normalized = normalizeFbc(invalidFbc, fbclid);
    expect(normalized).toContain('fb.1.');
    expect(normalized).toContain(fbclid);
  });

  it('should normalize and validate fbp cookie', () => {
    const fbp = 'fb.1.1724567890000.987654321';
    expect(normalizeFbp(fbp)).toBe(fbp);
    expect(normalizeFbp('  fb.1.123.456  ')).toBe('fb.1.123.456');
    expect(normalizeFbp('')).toBeUndefined();
  });

  it('should normalize full attribution and tracking bundle', () => {
    const rawAttribution = {
      fbclid: 'fbclid_xyz',
      utmSource: '  FACEBOOK  ',
      utmMedium: 'PAID_SOCIAL',
      utmCampaign: 'winter_2026',
    };
    const rawTracking = {
      fbp: 'fb.1.123.456',
    };

    const normalized = normalizeAttribution(rawAttribution, rawTracking);

    expect(normalized.fbclid).toBe('fbclid_xyz');
    expect(normalized.utmSource).toBe('facebook');
    expect(normalized.utmMedium).toBe('paid_social');
    expect(normalized.utmCampaign).toBe('winter_2026');
    expect(normalized.utm_source).toBe('facebook');
    expect(normalized.utm_medium).toBe('paid_social');
    expect(normalized.utm_campaign).toBe('winter_2026');
    expect(normalized.fbp).toBe('fb.1.123.456');
    expect(normalized.fbc).toContain('fb.1.');
  });

  it('should accurately capture and normalize utm_content and utm_term from both camelCase and snake_case', () => {
    // 1. Test camelCase
    const camelCaseAttribution = {
      utmContent: 'ad_variant_a',
      utmTerm: 'disability lawyer',
    };
    const res1 = normalizeAttribution(camelCaseAttribution);
    expect(res1.utmContent).toBe('ad_variant_a');
    expect(res1.utmTerm).toBe('disability lawyer');
    expect(res1.utm_content).toBe('ad_variant_a');
    expect(res1.utm_term).toBe('disability lawyer');

    // 2. Test snake_case
    const snakeCaseAttribution = {
      utm_content: 'ad_variant_b',
      utm_term: 'ssdi help',
    };
    const res2 = normalizeAttribution(snakeCaseAttribution);
    expect(res2.utmContent).toBe('ad_variant_b');
    expect(res2.utmTerm).toBe('ssdi help');
    expect(res2.utm_content).toBe('ad_variant_b');
    expect(res2.utm_term).toBe('ssdi help');
  });
});
