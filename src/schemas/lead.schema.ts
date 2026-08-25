import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name is too long'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name is too long'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short')
    .max(30, 'Phone number is too long')
    .refine(
      (val) => {
        // Must contain at least 7 digits
        const digits = val.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      },
      { message: 'Invalid phone number format' }
    ),
});

export const answersSchema = z
  .object({
    age: z
      .union([z.number(), z.string().transform((v) => parseInt(v, 10))])
      .optional(),
    employmentStatus: z.string().trim().optional(),
    receivingBenefits: z.string().trim().optional(),
    workingStatus: z.string().trim().optional(),
    conditionDuration: z.string().trim().optional(),
    underDoctorCare: z.string().trim().optional(),
  })
  .passthrough(); // Allows custom qualification fields from funnel

export const attributionSchema = z
  .object({
    fbclid: z.string().trim().optional(),
    gclid: z.string().trim().optional(),
    // Support camelCase
    utmSource: z.string().trim().optional(),
    utmMedium: z.string().trim().optional(),
    utmCampaign: z.string().trim().optional(),
    utmContent: z.string().trim().optional(),
    utmTerm: z.string().trim().optional(),
    // Support snake_case
    utm_source: z.string().trim().optional(),
    utm_medium: z.string().trim().optional(),
    utm_campaign: z.string().trim().optional(),
    utm_content: z.string().trim().optional(),
    utm_term: z.string().trim().optional(),
  })
  .passthrough()
  .optional();

export const trackingSchema = z
  .object({
    fbp: z.string().trim().optional(),
    fbc: z.string().trim().optional(),
  })
  .passthrough()
  .optional();

export const leadSubmissionSchema = z.object({
  contact: contactSchema,
  answers: answersSchema,
  attribution: attributionSchema,
  tracking: trackingSchema,
});

export type ValidatedLeadSubmission = z.infer<typeof leadSubmissionSchema>;
