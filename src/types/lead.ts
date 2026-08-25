export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface QualificationAnswers {
  age?: number | string;
  employmentStatus?: string;
  receivingBenefits?: string;
  workingStatus?: string;
  conditionDuration?: string;
  underDoctorCare?: string;
  [key: string]: unknown;
}

export interface LeadAttribution {
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

export interface LeadTracking {
  fbp?: string;
  fbc?: string;
}

export interface LeadSubmissionPayload {
  contact: ContactInfo;
  answers: QualificationAnswers;
  attribution?: LeadAttribution;
  tracking?: LeadTracking;
}

export type QualificationStatus = 'qualified' | 'not_qualified';

export interface QualificationResult {
  status: QualificationStatus;
  reason: string;
  details?: Record<string, unknown>;
}

export type DeliveryStatus = 'accepted' | 'failed' | 'skipped';

export interface LeadResponse {
  success: boolean;
  leadId: string;
  eventId: string;
  qualification: {
    status: QualificationStatus;
    reason?: string;
  };
  tracking: {
    meta: DeliveryStatus;
    automation: DeliveryStatus;
  };
  message?: string;
}

export interface MetaUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaCustomData {
  qualification_status: QualificationStatus;
  lead_id?: string;
  currency?: string;
  value?: number;
  [key: string]: unknown;
}

export interface MetaCapiEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: 'website' | 'system_generated' | 'app';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
}

export interface MetaCapiPayload {
  data: MetaCapiEvent[];
  test_event_code?: string;
}

export interface N8nLeadPayload {
  leadId: string;
  eventId: string;
  contact: ContactInfo;
  qualification: QualificationResult;
  answers: QualificationAnswers;
  attribution: LeadAttribution & LeadTracking;
  metadata: {
    clientIp?: string;
    userAgent?: string;
    referrer?: string;
    origin?: string;
  };
  createdAt: string;
}
