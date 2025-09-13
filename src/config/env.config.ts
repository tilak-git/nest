import { z } from 'zod';

import { logger } from '@/lib/logger/logger';

const envSchema = z.object({
  PORT: z.string().regex(/^\d+$/).transform(Number).default(5008),
  NODE_ENV: z.enum(['dev', 'stage', 'prod']),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN is required'),
  FRONTEND_ADMIN_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(6, 'ADMIN_PASSWORD must be at least 6 characters long'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logger.error(parsed.error.flatten().fieldErrors, 'Invalid environment variables:');
    process.exit(1);
  }

  return parsed.data;
}
