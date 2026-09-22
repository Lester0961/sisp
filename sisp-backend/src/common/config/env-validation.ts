/**
 * Startup environment validation (Phase 1, P1-06).
 *
 * Fails fast with a single clear error listing the missing variable names
 * instead of letting the first login/request discover a missing secret.
 * Values are never logged.
 */
import { z } from 'zod';

const requiredSchema = z.object({
  JWT_SECRET: z.string().trim().min(1),
  JWT_REFRESH_SECRET: z.string().trim().min(1),
});
const productionSchema = requiredSchema.extend({
  DATABASE_URL: z.string().trim().url(),
  ML_SERVICE_URL: z.string().trim().url(),
  ML_SECRET_TOKEN: z.string().trim().min(1),
});

export function isProductionEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.NODE_ENV || '').trim().toLowerCase() === 'production';
}

/**
 * ConfigModule `validate` adapter: receives the merged process/.env values
 * during module initialization, so `.env` secrets are already loaded.
 */
export function validateConfig(config: Record<string, unknown>): Record<string, unknown> {
  validateEnvironment(config as NodeJS.ProcessEnv);
  return config;
}

export function validateEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  const schema = isProductionEnvironment(env) ? productionSchema : requiredSchema;
  const result = schema.safeParse(env);
  if (!result.success) {
    const invalid = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    const missing = invalid.filter((key) => !env[key as keyof NodeJS.ProcessEnv]?.trim());
    const malformed = invalid.filter((key) => !missing.includes(key));
    const details = [
      missing.length ? `Missing required variable(s): ${missing.join(', ')}` : '',
      malformed.length ? `Invalid value format for: ${malformed.join(', ')}` : '',
    ].filter(Boolean).join('. ');
    throw new Error(
      `${details}. ` +
        'Set them in the environment or .env file before starting SISP.',
    );
  }

  // Access and refresh tokens must never share a signing secret, otherwise an
  // access token would also be a valid refresh credential (Phase 1).
  const jwtSecret = env.JWT_SECRET?.trim();
  const refreshSecret = env.JWT_REFRESH_SECRET?.trim();
  if (jwtSecret && refreshSecret && jwtSecret === refreshSecret) {
    throw new Error(
      'JWT_SECRET and JWT_REFRESH_SECRET must be different values before starting SISP.',
    );
  }

  const mfaRoles = (env.MFA_REQUIRED_ROLES || '').trim();
  if (mfaRoles && mfaRoles.toLowerCase() !== 'none') {
    const invalidRoles = mfaRoles
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean)
      .filter((role) =>
        !['student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin'].includes(role),
      );
    if (invalidRoles.length) {
      throw new Error(
        `MFA_REQUIRED_ROLES contains unknown role(s): ${invalidRoles.join(', ')}. ` +
          'Allowed values: student, faculty, dean, registrar, treasury, sys_admin, none.',
      );
    }
  }
}
