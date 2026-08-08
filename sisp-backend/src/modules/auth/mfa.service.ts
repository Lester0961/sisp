import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

interface OtpEntry {
  code: string;
  expiresAt: Date;
  attempts: number;
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly otpStore = new Map<string, OtpEntry>();
  private readonly otpTtlMs: number;
  private readonly maxOtpAttempts: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const ttlSeconds = Number(this.configService.get<string>('MFA_OTP_TTL_SECONDS') || 300);
    const maxAttempts = Number(this.configService.get<string>('MFA_MAX_ATTEMPTS') || 5);
    this.otpTtlMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : 300_000;
    this.maxOtpAttempts = Number.isFinite(maxAttempts) && maxAttempts > 0 ? Math.floor(maxAttempts) : 5;
  }

  /**
   * Generate a 6-digit OTP for the given userId, store it in memory, and log it to console for demo.
   */
  async generateOtp(userId: string): Promise<string> {
    // Clean up any existing OTP for this user
    this.otpStore.delete(userId);

    // Generate cryptographically random 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + this.otpTtlMs);

    this.otpStore.set(userId, { code, expiresAt, attempts: 0 });

    if (this.configService.get<string>('MFA_LOG_OTP')?.trim().toLowerCase() === 'true') {
      this.logger.warn(`MFA OTP logging is enabled for user ${userId}; disable it outside local testing.`);
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

      const brevoApiKey = this.configService.get<string>('BREVO_API_KEY')?.trim();
      const senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL')?.trim();
      const senderName =
        this.configService.get<string>('BREVO_SENDER_NAME')?.trim() || 'SISP Regis Marie College';

      if (!brevoApiKey || !senderEmail) {
        this.logger.error('Brevo MFA delivery is not configured with an API key and verified sender.');
        throw new ServiceUnavailableException('MFA email delivery is not configured.');
      }

      const recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there';
      const safeRecipientName = escapeHtml(recipientName);
      const safeCode = escapeHtml(code);

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: user.email,
              name: recipientName,
            },
          ],
          subject: 'Your SISP MFA OTP Verification Code',
          htmlContent: `
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  <h2 style="color: #1e3a8a; margin-top: 0;">Multi-Factor Authentication (MFA)</h2>
                  <p>Hello <strong>${safeRecipientName}</strong>,</p>
                  <p>A login request was made for your SISP account. Please use the following 6-digit One-Time Password (OTP) to complete your verification:</p>
                  <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827;">${safeCode}</span>
                  </div>
                  <p style="color: #4b5563;">This code is valid for <strong>${Math.round(this.otpTtlMs / 60_000)} minutes</strong>. If you did not request this login, please secure your account immediately.</p>
                  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
                  <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 0;">This is an automated system message. Please do not reply directly to this email.</p>
                </div>
              </body>
            </html>
          `,
          textContent: `Hello ${recipientName}, your SISP MFA verification code is ${code}. It expires in ${Math.round(this.otpTtlMs / 60_000)} minutes.`,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Failed to send MFA email via Brevo. Status: ${response.status}.`);
        throw new ServiceUnavailableException('MFA email delivery is unavailable.');
      } else {
        this.logger.log(`MFA OTP email successfully sent to ${user.email}`);
      }
    } catch (err: any) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Error sending MFA email via Brevo: ${err.message}`, err.stack);
      throw new ServiceUnavailableException('MFA email delivery is unavailable.');
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

    if (entry.attempts >= this.maxOtpAttempts) {
      this.otpStore.delete(userId);
      this.logger.warn(`MFA OTP attempt limit reached for user ${userId}`);
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
      entry.attempts += 1;
      if (entry.attempts >= this.maxOtpAttempts) {
        this.otpStore.delete(userId);
      }
      this.logger.warn(`Invalid OTP attempt for user ${userId}`);
      return false;
    }

    // Valid — remove from store (one-time use)
    this.otpStore.delete(userId);
    this.logger.log(`OTP verified successfully for user ${userId}`);
    return true;
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] || character,
  );
}
