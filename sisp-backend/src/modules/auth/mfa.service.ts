import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

interface OtpEntry {
  code: string;
  expiresAt: Date;
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly otpStore = new Map<string, OtpEntry>();
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a 6-digit OTP for the given userId, store it in memory, and log it to console for demo.
   */
  async generateOtp(userId: string): Promise<string> {
    // Clean up any existing OTP for this user
    this.otpStore.delete(userId);

    // Generate cryptographically random 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MS);

    this.otpStore.set(userId, { code, expiresAt });

    // Only log the full OTP in non-production environments for demo purposes.
    // Production must never print OTPs to logs — they would bypass MFA.
    if (process.env.NODE_ENV === 'production') {
      this.logger.debug(`MFA OTP generated for user ${userId}`);
    } else {
      this.logger.log(`========================================`);
      this.logger.log(`  MFA OTP for user ${userId}: ${code}`);
      this.logger.log(`  Expires at: ${expiresAt.toISOString()}`);
      this.logger.log(`========================================`);
    }

    // Trigger email delivery
    await this.sendMfaEmail(userId, code);

    return code;
  }

  /**
   * Send the generated MFA OTP code to the user's email via Brevo API.
   */
  private async sendMfaEmail(userId: string, code: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        this.logger.error(`User ${userId} not found for MFA OTP generation.`);
        return;
      }

      const brevoApiKey = this.configService.get<string>('BREVO_API_KEY');
      if (!brevoApiKey) {
        this.logger.warn(`BREVO_API_KEY is not set. Skipping email delivery for OTP.`);
        return;
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'SISP Regis Marie College',
            email: 'noreply@rmc.edu.ph',
          },
          to: [
            {
              email: user.email,
              name: `${user.firstName} ${user.lastName}`.trim(),
            },
          ],
          subject: 'Your SISP MFA OTP Verification Code',
          htmlContent: `
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <h2 style="color: #1e3a8a; margin-top: 0;">Multi-Factor Authentication (MFA)</h2>
                  <p>Hello <strong>${user.firstName} ${user.lastName}</strong>,</p>
                  <p>A login request was made for your SISP account. Please use the following 6-digit One-Time Password (OTP) to complete your verification:</p>
                  <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${code}</span>
                  </div>
                  <p style="color: #4b5563;">This code is valid for <strong>5 minutes</strong>. If you did not request this login, please secure your account immediately.</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                  <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">This is an automated system message. Please do not reply directly to this email.</p>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.error(
          `Failed to send MFA email via Brevo. Status: ${response.status}. Response: ${errBody}`,
        );
      } else {
        this.logger.log(`MFA OTP email successfully sent to ${user.email}`);
      }
    } catch (err: any) {
      this.logger.error(`Error sending MFA email via Brevo: ${err.message}`, err.stack);
    }
  }

  /**
   * Verify the OTP code for a given userId.
   * Returns true if valid, false otherwise.
   * Removes the OTP on successful verification (one-time use).
   */
  verifyOtp(userId: string, code: string): boolean {
    const entry = this.otpStore.get(userId);

    if (!entry) {
      this.logger.warn(`No OTP found for user ${userId}`);
      return false;
    }

    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.logger.warn(`OTP expired for user ${userId}`);
      this.otpStore.delete(userId);
      return false;
    }

    // Check code match
    if (entry.code !== code) {
      this.logger.warn(`Invalid OTP attempt for user ${userId}`);
      return false;
    }

    // Valid — remove from store (one-time use)
    this.otpStore.delete(userId);
    this.logger.log(`OTP verified successfully for user ${userId}`);
    return true;
  }
}
