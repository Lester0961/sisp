import { HttpException } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';

describe('KnowledgeBaseController dependency errors', () => {
  const originalFetch = global.fetch;
  const controllerWithSecret = (secret = 'local-test-secret') => {
    const config = {
      get: (key: string) => key === 'ML_SERVICE_URL' ? 'http://ml.local' : secret,
    };
    return new KnowledgeBaseController(config as any);
  };

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('reports a missing shared ML secret as a configuration error', async () => {
    let caught: unknown;
    try {
      await controllerWithSecret('').listDocuments();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getResponse()).toMatchObject({
      code: 'KB_ML_AUTH_NOT_CONFIGURED',
      statusCode: 503,
    });
  });

  it('distinguishes an unavailable ML service from database storage', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as any;
    let caught: unknown;
    try {
      await controllerWithSecret().listDocuments();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getResponse()).toMatchObject({
      code: 'KB_ML_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('maps a database connection outage reported by ML to a storage error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: 'Durable knowledge-base storage is unavailable.' }),
    }) as any;
    let caught: unknown;
    try {
      await controllerWithSecret().listDocuments();
    } catch (error) {
      caught = error;
    }

    expect((caught as HttpException).getResponse()).toMatchObject({
      code: 'KB_STORAGE_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('maps a database operation error without exposing upstream details', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: 'Knowledge-base documents could not be loaded.' }),
    }) as any;
    let caught: unknown;
    try {
      await controllerWithSecret().listDocuments();
    } catch (error) {
      caught = error;
    }

    expect((caught as HttpException).getResponse()).toMatchObject({
      code: 'KB_STORAGE_OPERATION_FAILED',
      statusCode: 503,
    });
    expect(JSON.stringify((caught as HttpException).getResponse())).not.toContain('could not be loaded');
  });

  it('preserves a successfully loaded empty knowledge-base list', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ documents: [] }),
    }) as any;

    await expect(controllerWithSecret().listDocuments()).resolves.toEqual({ documents: [] });
  });
});
