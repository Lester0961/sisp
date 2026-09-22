import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Minimal transactional email sender (Brevo). Used for MFA challenges and
 * password-reset links. Never logs message bodies or codes.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.senderEmail());
  }

  private apiKey(): string | undefined {
    return this.config.get<string>('BREVO_API_KEY')?.trim();
  }

  private senderEmail(): string | undefined {
    return this.config.get<string>('BREVO_SENDER_EMAIL')?.trim();
  }

  private senderName(): string {
    return this.config.get<string>('BREVO_SENDER_NAME')?.trim() || 'SISP Regis Marie College';
  }

  async send(to: string, toName: string, subject: string, html: string, text: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Email delivery is not configured.');
    }
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': this.apiKey() as string,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.senderName(), email: this.senderEmail() as string },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!response.ok) {
      this.logger.error(`Transactional email failed with status ${response.status}`);
      throw new ServiceUnavailableException('Email delivery is unavailable.');
    }
  }
}

export function escapeHtml(value: string): string {
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
