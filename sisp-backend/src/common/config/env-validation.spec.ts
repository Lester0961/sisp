import { isProductionEnvironment, validateEnvironment } from './env-validation';

describe('validateEnvironment (Phase 1, P1-06)', () => {
  it('lists missing JWT secrets instead of failing later at login', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' } as any)).toThrow(
      /JWT_SECRET, JWT_REFRESH_SECRET/,
    );
  });

  it('does not require database/ML service variables outside production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        JWT_SECRET: 'a',
        JWT_REFRESH_SECRET: 'b',
      } as any),
    ).not.toThrow();
  });

  it('requires database and ML service configuration in production', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'a',
        JWT_REFRESH_SECRET: 'b',
      } as any),
    ).toThrow(/DATABASE_URL, ML_SERVICE_URL, ML_SECRET_TOKEN/);
  });

  it('passes when all required variables are present', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        JWT_SECRET: 'a',
        JWT_REFRESH_SECRET: 'b',
        DATABASE_URL: 'postgresql://example',
        ML_SERVICE_URL: 'https://ml.example',
        ML_SECRET_TOKEN: 'c',
      } as any),
    ).not.toThrow();
  });

  it('rejects blank secrets and malformed production URLs without exposing values', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      JWT_SECRET: ' ',
      JWT_REFRESH_SECRET: 'b',
      DATABASE_URL: 'not-a-url',
      ML_SERVICE_URL: 'https://ml.example',
      ML_SECRET_TOKEN: 'c',
    } as any)).toThrow(/JWT_SECRET.*DATABASE_URL/);
  });

  it('treats NODE_ENV=production only as production', () => {
    expect(isProductionEnvironment({ NODE_ENV: 'production' } as any)).toBe(true);
    expect(isProductionEnvironment({ NODE_ENV: 'Production ' } as any)).toBe(true);
    expect(isProductionEnvironment({ NODE_ENV: 'development' } as any)).toBe(false);
    expect(isProductionEnvironment({} as any)).toBe(false);
  });
});
