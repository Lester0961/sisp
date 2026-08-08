export interface RateLimitConfig {
  globalTtlMs: number;
  globalLimit: number;
  loginTtlMs: number;
  loginLimit: number;
  registerTtlMs: number;
  registerLimit: number;
  mfaTtlMs: number;
  mfaLimit: number;
  refreshTtlMs: number;
  refreshLimit: number;
}

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

/**
 * Rate limits are intentionally environment-driven so a controlled test pass
 * can use a wider window without weakening the committed production defaults.
 */
export function getRateLimitConfig(): RateLimitConfig {
  const isTestProfile = process.env.RATE_LIMIT_PROFILE?.trim().toLowerCase() === 'test';

  return {
    globalTtlMs: toPositiveInt(
      process.env.RATE_LIMIT_GLOBAL_TTL_MS,
      isTestProfile ? 60_000 : 60_000,
    ),
    globalLimit: toPositiveInt(process.env.RATE_LIMIT_GLOBAL_LIMIT, isTestProfile ? 300 : 60),
    loginTtlMs: toPositiveInt(
      process.env.RATE_LIMIT_LOGIN_TTL_MS,
      isTestProfile ? 60_000 : 60_000,
    ),
    loginLimit: toPositiveInt(process.env.RATE_LIMIT_LOGIN_LIMIT, isTestProfile ? 30 : 5),
    registerTtlMs: toPositiveInt(
      process.env.RATE_LIMIT_REGISTER_TTL_MS,
      isTestProfile ? 60_000 : 60_000,
    ),
    registerLimit: toPositiveInt(process.env.RATE_LIMIT_REGISTER_LIMIT, isTestProfile ? 10 : 3),
    mfaTtlMs: toPositiveInt(
      process.env.RATE_LIMIT_MFA_TTL_MS,
      isTestProfile ? 60_000 : 60_000,
    ),
    mfaLimit: toPositiveInt(process.env.RATE_LIMIT_MFA_LIMIT, isTestProfile ? 30 : 5),
    refreshTtlMs: toPositiveInt(
      process.env.RATE_LIMIT_REFRESH_TTL_MS,
      isTestProfile ? 60_000 : 60_000,
    ),
    refreshLimit: toPositiveInt(process.env.RATE_LIMIT_REFRESH_LIMIT, isTestProfile ? 60 : 10),
  };
}
