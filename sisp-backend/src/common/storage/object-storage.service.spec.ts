import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageService (private document storage)', () => {
  const configFor = (values: Record<string, string | undefined>): any => ({
    get: jest.fn((key: string) => values[key]),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads to Supabase Storage with the server-side service key', async () => {
    const service = new ObjectStorageService(
      configFor({
        SUPABASE_URL: 'https://example.supabase.co/',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      }),
    );
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as any).fetch = fetchMock;

    await service.save('admission-requirements', 'app-1/form137.pdf', Buffer.from('pdf'), 'application/pdf');

    expect(service.isRemoteEnabled()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/admission-requirements/app-1/form137.pdf',
    );
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer service-key');
    expect(init.headers['content-type']).toBe('application/pdf');
  });

  it('fails closed when the storage upload is rejected', async () => {
    const service = new ObjectStorageService(
      configFor({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      }),
    );
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      service.save('identity-documents', 'ver-1/abc.png', Buffer.from('img'), 'image/png'),
    ).rejects.toThrow('Document storage is unavailable');
  });

  it('builds a signed URL from the storage response', async () => {
    const service = new ObjectStorageService(
      configFor({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      }),
    );
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        signedURL: '/storage/v1/object/sign/identity-documents/ver-1/abc.png?token=x',
      }),
    });

    const url = await service.createSignedUrl('identity-documents', 'ver-1/abc.png', 300);

    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/sign/identity-documents/ver-1/abc.png?token=x',
    );
  });

  it('uses a private local directory when remote storage is not configured', async () => {
    const os = require('node:os');
    const path = require('node:path');
    const fs = require('node:fs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sisp-obj-storage-'));
    const service = new ObjectStorageService(configFor({ OBJECT_STORAGE_LOCAL_DIR: dir }));

    await service.save('admission-requirements', 'app-2/doc.png', Buffer.from('img'), 'image/png');

    expect(fs.existsSync(path.join(dir, 'admission-requirements', 'app-2', 'doc.png'))).toBe(true);
    expect(service.isRemoteEnabled()).toBe(false);
    await expect(service.createSignedUrl('admission-requirements', 'app-2/doc.png')).resolves.toBeNull();
  });
});
