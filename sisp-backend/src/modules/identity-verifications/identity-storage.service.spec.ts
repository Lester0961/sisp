import { IdentityStorageService } from './identity-storage.service';

describe('IdentityStorageService (private ID storage)', () => {
  const configFor = (values: Record<string, string | undefined>): any => ({
    get: jest.fn((key: string) => values[key]),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uploads to Supabase Storage with the server-side service key', async () => {
    const service = new IdentityStorageService(
      configFor({
        SUPABASE_URL: 'https://example.supabase.co/',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
        IDENTITY_STORAGE_BUCKET: 'identity-documents',
      }),
    );
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    (global as any).fetch = fetchMock;

    await service.save('ver-1/abc.png', Buffer.from('img'), 'image/png');

    expect(service.isRemoteEnabled()).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/storage/v1/object/identity-documents/ver-1/abc.png');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer service-key');
    expect(init.headers['content-type']).toBe('image/png');
  });

  it('fails closed when the storage upload is rejected', async () => {
    const service = new IdentityStorageService(
      configFor({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      }),
    );
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(service.save('ver-1/abc.png', Buffer.from('img'), 'image/png')).rejects.toThrow(
      'Identification storage is unavailable',
    );
  });

  it('builds a signed URL from the storage response', async () => {
    const service = new IdentityStorageService(
      configFor({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-key',
        IDENTITY_STORAGE_BUCKET: 'identity-documents',
      }),
    );
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ signedURL: '/storage/v1/object/sign/identity-documents/ver-1/abc.png?token=x' }),
    });

    const url = await service.createSignedUrl('ver-1/abc.png', 300);

    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/sign/identity-documents/ver-1/abc.png?token=x',
    );
  });

  it('uses a private local directory when remote storage is not configured', async () => {
    const os = require('node:os');
    const path = require('node:path');
    const fs = require('node:fs');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sisp-id-storage-'));
    const service = new IdentityStorageService(configFor({ IDENTITY_STORAGE_DIR: dir }));

    await service.save('ver-2/xyz.pdf', Buffer.from('pdf'), 'application/pdf');

    expect(fs.existsSync(path.join(dir, 'ver-2', 'xyz.pdf'))).toBe(true);
    expect(service.isRemoteEnabled()).toBe(false);
    await expect(service.createSignedUrl('ver-2/xyz.pdf')).resolves.toBeNull();
  });
});
