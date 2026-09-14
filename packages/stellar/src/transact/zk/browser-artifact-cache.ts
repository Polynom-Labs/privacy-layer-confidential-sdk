import { ZK_ARTIFACT_VERSION } from '@arcanetech/stellar-privacy-pool-zk-sdk';

const ZK_ARTIFACT_CACHE_NAME = `privacy-sdk-stellar-zk-artifacts:${ZK_ARTIFACT_VERSION}`;

type ArtifactResponse = {
  ok: boolean;
  status: number;
  clone(): ArtifactResponse;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type BrowserCache = {
  match(url: string): Promise<ArtifactResponse | undefined>;
  put(url: string, response: ArtifactResponse): Promise<void>;
};

type BrowserCacheStorage = {
  open(cacheName: string): Promise<BrowserCache>;
};

export function isBrowserCacheApiAvailable(): boolean {
  return browserCacheStorage() !== undefined;
}

function readCaches(): BrowserCacheStorage | null | undefined {
  return (globalThis as unknown as { caches?: BrowserCacheStorage | null }).caches;
}

function browserCacheStorage(): BrowserCacheStorage | undefined {
  const cachesValue = readCaches();
  if (cachesValue === undefined || cachesValue === null) {
    return undefined;
  }
  return cachesValue;
}

function absoluteArtifactUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return url;
  }
  const href = (globalThis as { location?: { href: string } }).location?.href;
  if (href === undefined) {
    return url;
  }
  return new URL(url, href).href;
}

async function rememberResponse(
  url: string,
  response: ArtifactResponse,
): Promise<void> {
  const storage = browserCacheStorage();
  if (storage === undefined) {
    return;
  }
  try {
    const cache = await storage.open(ZK_ARTIFACT_CACHE_NAME);
    await cache.put(url, response.clone());
  } catch {
    return;
  }
}

async function fetchNetworkArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = (await fetch(url)) as unknown as ArtifactResponse;
  if (!response.ok) {
    throw new Error(`Failed to fetch ZK artifact ${url}: ${String(response.status)}`);
  }
  await rememberResponse(url, response);
  return response.arrayBuffer();
}

export async function fetchArrayBufferWithBrowserCache(
  url: string,
): Promise<ArrayBuffer> {
  const requestUrl = absoluteArtifactUrl(url);
  const storage = browserCacheStorage();
  if (storage !== undefined) {
    const cache = await storage.open(ZK_ARTIFACT_CACHE_NAME);
    const cached = await cache.match(requestUrl);
    if (cached?.ok === true) {
      return cached.arrayBuffer();
    }
  }
  return fetchNetworkArrayBuffer(requestUrl);
}
