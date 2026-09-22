import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Private object storage for identity-verification uploads.
 *
 * Free-tier production path: Supabase Storage (private bucket, service-role
 * key server-side only). Local development falls back to a private directory.
 * Object keys are opaque; documents are only ever exposed through short-lived
 * signed URLs created by the backend.
 */
@Injectable()
export class IdentityStorageService {
  private readonly logger = new Logger(IdentityStorageService.name);

  constructor(private readonly config: ConfigService) {}

  private supabaseUrl(): string | undefined {
    return this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '') || undefined;
  }

  private serviceKey(): string | undefined {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() || undefined;
  }

  private bucket(): string {
    return this.config.get<string>('IDENTITY_STORAGE_BUCKET')?.trim() || 'identity-documents';
  }

  isRemoteEnabled(): boolean {
    return Boolean(this.supabaseUrl() && this.serviceKey());
  }

  async save(objectKey: string, content: Buffer, contentType: string): Promise<void> {
    if (this.isRemoteEnabled()) {
      const response = await fetch(
        `${this.supabaseUrl()}/storage/v1/object/${encodeURIComponent(this.bucket())}/${objectKey}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.serviceKey()}`,
            apikey: this.serviceKey() as string,
            'content-type': contentType,
            'x-upsert': 'false',
          },
          body: new Uint8Array(content),
        },
      );
      if (!response.ok) {
        this.logger.error(`Object storage upload failed with status ${response.status}`);
        throw new ServiceUnavailableException('Identification storage is unavailable.');
      }
      return;
    }

    // Local development fallback; not durable on ephemeral hosts.
    const root =
      this.config.get<string>('IDENTITY_STORAGE_DIR') || path.join(process.cwd(), 'storage', 'identity');
    const target = path.join(root, objectKey);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { mode: 0o600 });
  }

  /**
   * Returns a short-lived signed URL, or null when running on the local
   * fallback (callers then report metadata only).
   */
  async createSignedUrl(objectKey: string, expiresInSeconds = 300): Promise<string | null> {
    if (!this.isRemoteEnabled()) return null;
    const response = await fetch(
      `${this.supabaseUrl()}/storage/v1/object/sign/${encodeURIComponent(this.bucket())}/${objectKey}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceKey()}`,
          apikey: this.serviceKey() as string,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      },
    );
    if (!response.ok) {
      this.logger.error(`Signed URL creation failed with status ${response.status}`);
      throw new ServiceUnavailableException('Could not create a secure document link.');
    }
    const data = (await response.json()) as { signedURL?: string };
    if (!data.signedURL) {
      throw new ServiceUnavailableException('Could not create a secure document link.');
    }
    return `${this.supabaseUrl()}${data.signedURL}`;
  }
}
