import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginThrottlerGuard } from '../../common/guards/login-throttler.guard';
import { getRateLimitConfig } from '../../common/config/rate-limit.config';

const rateLimitConfig = getRateLimitConfig();

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Strict limit on OTP brute-force: 5 attempts / minute
  @Public()
  @Throttle({
    default: {
      ttl: rateLimitConfig.mfaTtlMs,
      limit: rateLimitConfig.mfaLimit,
    },
  })
  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfa(dto.mfaToken, dto.otpCode);
  }

  // Refresh endpoint — 10/min to limit token brute-force
  @Public()
  @Throttle({
    default: {
      ttl: rateLimitConfig.refreshTtlMs,
      limit: rateLimitConfig.refreshLimit,
    },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }
}
