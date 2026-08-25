import { z } from 'zod';

export const metaUserDataSchema = z.object({
  em: z.array(z.string()).optional(),
  ph: z.array(z.string()).optional(),
  fn: z.array(z.string()).optional(),
  ln: z.array(z.string()).optional(),
  client_ip_address: z.string().optional(),
  client_user_agent: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
});

export const metaCustomDataSchema = z.object({
  qualification_status: z.enum(['qualified', 'not_qualified']),
  lead_id: z.string().optional(),
  currency: z.string().optional(),
  value: z.number().optional(),
}).passthrough();

export const metaCapiEventSchema = z.object({
  event_name: z.string().min(1),
  event_time: z.number().int().positive(),
  event_id: z.string().min(1),
  event_source_url: z.string().url().optional(),
  action_source: z.enum(['website', 'system_generated', 'app']),
  user_data: metaUserDataSchema,
  custom_data: metaCustomDataSchema.optional(),
});

export const metaCapiPayloadSchema = z.object({
  data: z.array(metaCapiEventSchema).min(1),
  test_event_code: z.string().optional(),
});
