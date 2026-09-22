import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MfaService } from './mfa.service';
import { MailService } from './mail.service';
import { SessionService } from './session.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set. Refusing to start with an insecure default.');
        }
        return {
          secret,
          signOptions: {
            // Short-lived access tokens (Phase 1); refresh lives in AuthSession.
            expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '15m',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MfaService, MailService, SessionService, JwtStrategy],
  exports: [AuthService, MfaService, MailService, SessionService, JwtModule],
})
export class AuthModule {}
