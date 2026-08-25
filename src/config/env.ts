import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Meta Conversions API
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN is required'),
  META_PIXEL_ID: z.string().min(1, 'META_PIXEL_ID is required'),
  META_API_VERSION: z.string().default('v20.0'),
  META_TEST_EVENT_CODE: z.string().optional(),

  // n8n Automation Webhook
  N8N_WEBHOOK_URL: z.string().url('N8N_WEBHOOK_URL must be a valid URL'),
  N8N_WEBHOOK_SECRET: z.string().optional(),

  // Resilience & Rate Limiting
  REQUEST_TIMEOUT_MS: z.coerce.number().default(8000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(30),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ FATAL: Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    // Return partial/fallback for test environment if needed
    throw new Error(`Environment validation failed: ${result.error.message}`);
  }

  return result.data;
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
