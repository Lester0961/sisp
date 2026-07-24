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
import { Roles } from '../../common/decorators/roles.decorator';

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

@Controller('admin/kb')
@Roles('admin_staff', 'sys_admin')
export class KnowledgeBaseController {
  private readonly logger = new Logger(KnowledgeBaseController.name);
  private readonly mlServiceUrl: string;
  private readonly mlSecret: string;

  constructor(private readonly config: ConfigService) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
    this.mlSecret = this.config.get<string>('ML_SECRET_TOKEN') || 'default-ml-secret';
  }

  private async proxyToMl(method: string, path: string, body?: any): Promise<any> {
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
        // Never relay raw ML error body to the client — could leak internals
        this.logger.error(`ML service returned ${response.status}: ${await response.text()}`);
        throw new HttpException('ML service request failed', response.status);
      }

      return response.json();
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Failed to proxy to ML service: ${error.message}`);
      throw new HttpException('Failed to connect to ML service', HttpStatus.SERVICE_UNAVAILABLE);
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
