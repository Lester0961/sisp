import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { MfaResendDto } from './dto/mfa-resend.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginThrottlerGuard } from '../../common/guards/login-throttler.guard';
import { getRateLimitConfig } from '../../common/config/rate-limit.config';

export const REFRESH_COOKIE = 'sisp_refresh';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const rateLimitConfig = getRateLimitConfig();

export function getRefreshCookieOptions(nodeEnv = process.env.NODE_ENV) {
  const isProduction = (nodeEnv || '').trim().toLowerCase() === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    // The browser app and API are hosted on different sites (Vercel and
    // Render). A Lax cookie is omitted from the credentialed cross-site
    // refresh POST, so use the required Secure/None pair in production.
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // The refresh credential lives in an HttpOnly cookie scoped to /api/auth.
  // It is never exposed to browser JavaScript.
  private cookieOptions() {
    return getRefreshCookieOptions();
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, this.cookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
  }

  @Public()
  @Throttle({
    default: {
      ttl: rateLimitConfig.registerTtlMs,
      limit: rateLimitConfig.registerLimit,
    },
  })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Throttle({
    default: {
      ttl: rateLimitConfig.loginTtlMs,
      limit: rateLimitConfig.loginLimit,
    },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      request.ip,
      request.get('user-agent') ?? undefined,
    );
    if ('refreshToken' in result && result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken);
      const { refreshToken: _discard, ...safe } = result as typeof result & { refreshToken: string };
      return safe;
    }
    return result;
  }

  // Strict limit on OTP brute-force: 5 attempts / minute.
  @Public()
  @Throttle({
    default: {
      ttl: rateLimitConfig.mfaTtlMs,
      limit: rateLimitConfig.mfaLimit,
    },
  })
  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body() dto: VerifyMfaDto,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyMfa(
      dto.challengeId,
      dto.otpCode,
      request.ip,
      request.get('user-agent') ?? undefined,
    );
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _discard, ...safe } = result;
    return safe;
  }

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('mfa/resend')
  @HttpCode(HttpStatus.OK)
  async resendMfa(@Body() dto: MfaResendDto, @Req() request: Request) {
    return this.authService.resendMfa(dto.challengeId, request.ip);
  }

  // Refresh endpoint — 10/min to limit token brute-force.
  @Public()
  @Throttle({
    default: {
      ttl: rateLimitConfig.refreshTtlMs,
      limit: rateLimitConfig.refreshLimit,
    },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (request.cookies?.[REFRESH_COOKIE] as string | undefined) ?? undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('No active session');
    }
    const result = await this.authService.refresh(
      refreshToken,
      request.ip,
      request.get('user-agent') ?? undefined,
    );
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _discard, ...safe } = result;
    return safe;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearRefreshCookie(res);
    return this.authService.logout(user.sub, user.sid);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearRefreshCookie(res);
    return this.authService.logoutAll(user.sub);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.sub);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      user.sub,
      user.sid,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.forgotPassword(dto.email, request.ip);
  }

  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @Throttle({ default: { ttl: 15 * 60_000, limit: 5 } })
  @Post('activate-student')
  @HttpCode(HttpStatus.OK)
  async activateStudent(@Body() dto: ResetPasswordDto) {
    return this.authService.activateStudentAccount(dto.token, dto.newPassword);
  }
}
