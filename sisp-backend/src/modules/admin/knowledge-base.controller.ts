import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';

// Strict allowlist for filename segments — blocks path traversal, encoded
// slashes, and unusual characters before interpolating into the ML URL.
const SAFE_FILENAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

const validateFilename = (filename: string): string => {
  if (!SAFE_FILENAME_RE.test(filename)) {
    throw new BadRequestException(
      'Invalid filename: only alphanumeric, dot, underscore, and hyphen characters are allowed (max 128 chars, must not start with a dot).',
    );
  }
  return filename;
};

type KnowledgeBaseErrorCode =
  | 'KB_ML_AUTH_NOT_CONFIGURED'
  | 'KB_ML_UNAVAILABLE'
  | 'KB_STORAGE_UNAVAILABLE'
  | 'KB_STORAGE_OPERATION_FAILED'
  | 'KB_REINDEX_FAILED'
  | 'KB_UPSTREAM_ERROR';

const kbError = (code: KnowledgeBaseErrorCode, message: string, status: number): HttpException =>
  new HttpException({ statusCode: status, code, message }, status);

function upstreamDetail(payload: any): string {
  if (typeof payload?.detail === 'string') return payload.detail;
  if (typeof payload?.message === 'string') return payload.message;
  return '';
}

@Controller('admin/kb')
@RequirePermissions('knowledge_base.manage')
export class KnowledgeBaseController {
  private readonly logger = new Logger(KnowledgeBaseController.name);
  private readonly mlServiceUrl: string;
  private readonly mlSecret: string;

  constructor(private readonly config: ConfigService) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
    // No shared default: a missing service secret must fail closed.
    this.mlSecret = this.config.get<string>('ML_SECRET_TOKEN') || '';
  }

  private async proxyToMl(method: string, path: string, body?: any): Promise<any> {
    if (!this.mlSecret) {
      throw kbError(
        'KB_ML_AUTH_NOT_CONFIGURED',
        'ML service authentication is not configured. Verify the local ML service secret configuration.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const url = `${this.mlServiceUrl}${path}`;
    this.logger.log(`Proxying ${method} ${url}`);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-ML-Secret': this.mlSecret,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        // Parse only enough to classify the dependency failure. Never relay or
        // log the raw upstream body because it can contain implementation data.
        const payload = await response.json().catch(() => null);
        const detail = upstreamDetail(payload);
        const upstreamCode = payload?.code ?? payload?.detail?.code;
        let code: KnowledgeBaseErrorCode = 'KB_UPSTREAM_ERROR';
        let message = 'The knowledge-base service could not complete the request.';

        if (
          upstreamCode === 'KB_STORAGE_UNAVAILABLE' ||
          /durable knowledge-base storage is unavailable/i.test(detail)
        ) {
          code = 'KB_STORAGE_UNAVAILABLE';
          message = 'Knowledge-base database storage is unavailable. Start the local database and verify its reviewed schema before retrying.';
        } else if (
          upstreamCode === 'KB_STORAGE_OPERATION_FAILED' ||
          /knowledge-base .+ could not be (loaded|created|updated|archived|scheduled)/i.test(detail)
        ) {
          code = path === '/kb/reindex' ? 'KB_REINDEX_FAILED' : 'KB_STORAGE_OPERATION_FAILED';
          message = path === '/kb/reindex'
            ? 'The re-index request could not be scheduled. Check database storage and ML service logs; completion was not confirmed.'
            : 'The knowledge-base database operation failed. Check the local schema and service logs; no success was confirmed.';
        } else if (path === '/kb/reindex' && response.status >= 500) {
          code = 'KB_REINDEX_FAILED';
          message = 'The re-index request failed. Check ML and database status; completion was not confirmed.';
        }

        this.logger.warn(`ML knowledge-base request failed: method=${method} path=${path} status=${response.status} code=${code}`);
        throw kbError(code, message, response.status);
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to proxy to ML service: ${error instanceof Error ? error.name : 'unknown error'}`);
      throw kbError(
        'KB_ML_UNAVAILABLE',
        'ARIA ML service is unavailable. Check the local ML service and ML_SERVICE_URL, then retry.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Get('documents')
  async listDocuments() {
    return this.proxyToMl('GET', '/kb/documents');
  }

  @Get('documents/:filename')
  async getDocument(@Param('filename') filename: string) {
    const safe = validateFilename(filename);
    return this.proxyToMl('GET', `/kb/documents/${encodeURIComponent(safe)}`);
  }

  @Put('documents/:filename')
  async updateDocument(@Param('filename') filename: string, @Body() body: { content: string }) {
    const safe = validateFilename(filename);
    return this.proxyToMl('PUT', `/kb/documents/${encodeURIComponent(safe)}`, body);
  }

  @Post('documents')
  async createDocument(@Body() body: { filename: string; content: string; category: string }) {
    if (!body?.filename) {
      throw new BadRequestException('filename is required');
    }
    body.filename = validateFilename(body.filename);
    return this.proxyToMl('POST', '/kb/documents', body);
  }

  @Delete('documents/:filename')
  async deleteDocument(@Param('filename') filename: string) {
    const safe = validateFilename(filename);
    return this.proxyToMl('DELETE', `/kb/documents/${encodeURIComponent(safe)}`);
  }

  @Post('reindex')
  async reindexEmbeddings() {
    return this.proxyToMl('POST', '/kb/reindex');
  }
}
