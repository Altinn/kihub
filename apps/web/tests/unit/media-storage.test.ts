import { describe, expect, it } from 'vitest';
import {
  buildMediaStoragePlugins,
  resolveAzureMediaConfig,
  resolveMediaStorageMode,
} from '@/lib/media-storage';

/**
 * 014 T030 — the media storage seam (contracts/media-storage.md §B, guarantees B1.1–B1.4).
 *
 * The point of these tests is FR-025: a misconfigured deployed environment must fail LOUDLY at
 * startup rather than quietly serving broken images. Because `src/instrumentation.ts` initialises
 * Payload at container boot in production, a throw here crash-loops the container with a clear
 * message — which is the behaviour being pinned.
 */
describe('resolveMediaStorageMode', () => {
  it('defaults to disk when unset (B1.4 — local dev needs no Azure variable)', () => {
    expect(resolveMediaStorageMode({})).toBe('disk');
    expect(resolveMediaStorageMode({ MEDIA_STORAGE_MODE: undefined })).toBe('disk');
  });

  it('accepts the two supported modes', () => {
    expect(resolveMediaStorageMode({ MEDIA_STORAGE_MODE: 'disk' })).toBe('disk');
    expect(resolveMediaStorageMode({ MEDIA_STORAGE_MODE: 'azure' })).toBe('azure');
  });

  it('THROWS on an unrecognised value rather than falling back to disk (B1.2)', () => {
    // A typo must not silently become the ephemeral configuration in a deployed environment.
    expect(() => resolveMediaStorageMode({ MEDIA_STORAGE_MODE: 'azzure' })).toThrow(
      /must be "disk" or "azure"/,
    );
    expect(() => resolveMediaStorageMode({ MEDIA_STORAGE_MODE: 'blob' })).toThrow(/azzure|azure/);
    expect(() => resolveMediaStorageMode({ MEDIA_STORAGE_MODE: '' })).toThrow();
  });
});

describe('resolveAzureMediaConfig (B1.1)', () => {
  const valid = {
    AZURE_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y',
    AZURE_STORAGE_CONTAINER_NAME: 'kihub-media',
    AZURE_STORAGE_ACCOUNT_BASEURL: 'https://x.blob.core.windows.net/kihub-media',
  };

  it('returns all three settings when present', () => {
    expect(resolveAzureMediaConfig(valid)).toEqual({
      connectionString: valid.AZURE_STORAGE_CONNECTION_STRING,
      containerName: 'kihub-media',
      baseURL: 'https://x.blob.core.windows.net/kihub-media',
    });
  });

  it('THROWS naming the missing base URL — the adapter requires it, despite reading as optional in the docs', () => {
    expect(() =>
      resolveAzureMediaConfig({
        AZURE_STORAGE_CONNECTION_STRING: 'x',
        AZURE_STORAGE_CONTAINER_NAME: 'c',
      }),
    ).toThrow(/AZURE_STORAGE_ACCOUNT_BASEURL/);
  });

  it('THROWS naming the missing connection string', () => {
    expect(() =>
      resolveAzureMediaConfig({ ...valid, AZURE_STORAGE_CONNECTION_STRING: undefined }),
    ).toThrow(/AZURE_STORAGE_CONNECTION_STRING/);
  });

  it('THROWS naming the missing container name', () => {
    expect(() =>
      resolveAzureMediaConfig({ ...valid, AZURE_STORAGE_CONTAINER_NAME: undefined }),
    ).toThrow(/AZURE_STORAGE_CONTAINER_NAME/);
  });

  it('THROWS naming ALL THREE when none are set', () => {
    const run = () => resolveAzureMediaConfig({});
    expect(run).toThrow(/AZURE_STORAGE_CONNECTION_STRING/);
    expect(run).toThrow(/AZURE_STORAGE_CONTAINER_NAME/);
    expect(run).toThrow(/AZURE_STORAGE_ACCOUNT_BASEURL/);
  });

  it('treats a blank or whitespace-only value as missing', () => {
    // An empty variable in a deployment template is the likeliest real misconfiguration.
    expect(() =>
      resolveAzureMediaConfig({ ...valid, AZURE_STORAGE_CONNECTION_STRING: '' }),
    ).toThrow(/AZURE_STORAGE_CONNECTION_STRING/);
    expect(() =>
      resolveAzureMediaConfig({ ...valid, AZURE_STORAGE_CONTAINER_NAME: '   ' }),
    ).toThrow(/AZURE_STORAGE_CONTAINER_NAME/);
  });
});

describe('buildMediaStoragePlugins', () => {
  it('registers NO plugin in disk mode — the absence of a plugin IS the disk configuration', () => {
    expect(buildMediaStoragePlugins({})).toEqual([]);
    expect(buildMediaStoragePlugins({ MEDIA_STORAGE_MODE: 'disk' })).toEqual([]);
  });

  it('needs no Azure variable in disk mode (B1.4 — the suite runs this way)', () => {
    expect(() => buildMediaStoragePlugins({ MEDIA_STORAGE_MODE: 'disk' })).not.toThrow();
  });

  it('registers exactly one plugin in azure mode', () => {
    const plugins = buildMediaStoragePlugins({
      MEDIA_STORAGE_MODE: 'azure',
      AZURE_STORAGE_CONNECTION_STRING: 'DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y',
      AZURE_STORAGE_CONTAINER_NAME: 'kihub-media',
      AZURE_STORAGE_ACCOUNT_BASEURL: 'https://x.blob.core.windows.net/kihub-media',
    });
    expect(plugins).toHaveLength(1);
    expect(typeof plugins[0]).toBe('function');
  });

  it('THROWS in azure mode when misconfigured — at config time, i.e. at boot (B1.3)', () => {
    expect(() => buildMediaStoragePlugins({ MEDIA_STORAGE_MODE: 'azure' })).toThrow(
      /MEDIA_STORAGE_MODE=azure requires/,
    );
  });
});
