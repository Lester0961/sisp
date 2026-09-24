import { getRefreshCookieOptions } from './auth.controller';

describe('getRefreshCookieOptions', () => {
  it('uses a cross-site secure cookie in production', () => {
    expect(getRefreshCookieOptions('production')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/auth',
    });
  });

  it('keeps local development cookies on the same-site policy', () => {
    expect(getRefreshCookieOptions('development')).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth',
    });
  });
});
