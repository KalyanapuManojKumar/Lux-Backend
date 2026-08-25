export interface RawAttribution {
  fbclid?: string;
  gclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  [key: string]: unknown;
}

export interface RawTracking {
  fbp?: string;
  fbc?: string;
  [key: string]: unknown;
}

export interface NormalizedAttribution {
  fbclid?: string;
  gclid?: string;
  // CamelCase variants
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  // Snake_case variants (for n8n workflows & Airtable fields)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbp?: string;
  fbc?: string;
  [key: string]: unknown;
}

/**
 * Constructs a valid Meta fbc string from an fbclid if fbc was not already set.
 * Meta fbc format: fb.<subdomainIndex>.<creationTimeMillis>.<fbclid>
 * Default subdomainIndex is 1.
 */
export const buildFbcFromFbclid = (fbclid?: string, timestampMs: number = Date.now()): string | undefined => {
  if (!fbclid || typeof fbclid !== 'string') {
    return undefined;
  }
  const cleanFbclid = fbclid.trim();
  if (!cleanFbclid) {
    return undefined;
  }
  return `fb.1.${timestampMs}.${cleanFbclid}`;
};

/**
 * Validates and normalizes an existing fbc string.
 * Meta fbc format: fb.X.TIMESTAMP.FBCLID
 */
export const normalizeFbc = (fbc?: string, fbclid?: string): string | undefined => {
  if (fbc && typeof fbc === 'string') {
    const trimmed = fbc.trim();
    if (trimmed.startsWith('fb.') && trimmed.split('.').length >= 4) {
      return trimmed;
    }
  }
  // Fallback: build from fbclid if available
  if (fbclid) {
    return buildFbcFromFbclid(fbclid);
  }
  return undefined;
};

/**
 * Validates and normalizes fbp (Facebook browser cookie).
 * Format: fb.X.TIMESTAMP.RANDOM_NUMBER
 */
export const normalizeFbp = (fbp?: string): string | undefined => {
  if (!fbp || typeof fbp !== 'string') {
    return undefined;
  }
  const trimmed = fbp.trim();
  if (trimmed.startsWith('fb.') && trimmed.split('.').length >= 4) {
    return trimmed;
  }
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Normalizes all marketing attribution and tracking parameters.
 * Accurately extracts both camelCase and snake_case UTM fields (utm_content, utm_term, utm_source, utm_medium, utm_campaign)
 * and populates both conventions so n8n and Airtable receive complete data.
 */
export const normalizeAttribution = (
  attribution?: RawAttribution,
  tracking?: RawTracking
): NormalizedAttribution => {
  const fbclid = (attribution?.fbclid as string)?.trim() || undefined;
  const gclid = (attribution?.gclid as string)?.trim() || undefined;

  const rawSource = (attribution?.utmSource || attribution?.utm_source) as string | undefined;
  const rawMedium = (attribution?.utmMedium || attribution?.utm_medium) as string | undefined;
  const rawCampaign = (attribution?.utmCampaign || attribution?.utm_campaign) as string | undefined;
  const rawContent = (attribution?.utmContent || attribution?.utm_content) as string | undefined;
  const rawTerm = (attribution?.utmTerm || attribution?.utm_term) as string | undefined;

  const utmSource = typeof rawSource === 'string' && rawSource.trim() ? rawSource.trim().toLowerCase() : undefined;
  const utmMedium = typeof rawMedium === 'string' && rawMedium.trim() ? rawMedium.trim().toLowerCase() : undefined;
  const utmCampaign = typeof rawCampaign === 'string' && rawCampaign.trim() ? rawCampaign.trim() : undefined;
  const utmContent = typeof rawContent === 'string' && rawContent.trim() ? rawContent.trim() : undefined;
  const utmTerm = typeof rawTerm === 'string' && rawTerm.trim() ? rawTerm.trim() : undefined;

  const fbp = normalizeFbp(tracking?.fbp as string | undefined);
  const fbc = normalizeFbc(tracking?.fbc as string | undefined, fbclid);

  return {
    fbclid,
    gclid,
    // CamelCase
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    // Snake_case
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    fbp,
    fbc,
  };
};
