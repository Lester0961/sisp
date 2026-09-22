import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Private object storage shared by admission requirements and identity
 * verification uploads.
 *
 * Production (free tier): Supabase Storage private buckets, written with the
 * server-side service-role key only. Development: a private local directory.
 * Bucket names are passed per call; object keys are opaque and are never
 * returned to clients — documents are only reachable through short-lived
 * signed URLs created by the backend.
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);

  constructor(private readonly config: ConfigService) {}

  private supabaseUrl(): string | undefined {
    return this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '') || undefined;
  }

  private serviceKey(): string | undefined {
    return this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim() || undefined;
  }

  private localRoot(): string {
    return (
      this.config.get<string>('OBJECT_STORAGE_LOCAL_DIR') ||
      path.join(process.cwd(), 'storage')
    );
  }

  isRemoteEnabled(): boolean {
    return Boolean(this.supabaseUrl() && this.serviceKey());
  }

  async save(bucket: string, objectKey: string, content: Buffer, contentType: string): Promise<void> {
    if (this.isRemoteEnabled()) {
      const response = await fetch(
        `${this.supabaseUrl()}/storage/v1/object/${encodeURIComponent(bucket)}/${objectKey}`,
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
        throw new ServiceUnavailableException('Document storage is unavailable.');
      }
      return;
    }

    // Local development fallback; not durable on ephemeral hosts.
    const target = path.join(this.localRoot(), bucket, objectKey);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { mode: 0o600 });
  }

  /**
   * Returns a short-lived signed URL, or null when running on the local
   * fallback (callers then report metadata only).
   */
  async createSignedUrl(bucket: string, objectKey: string, expiresInSeconds = 300): Promise<string | null> {
    if (!this.isRemoteEnabled()) return null;
    const response = await fetch(
      `${this.supabaseUrl()}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectKey}`,
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
