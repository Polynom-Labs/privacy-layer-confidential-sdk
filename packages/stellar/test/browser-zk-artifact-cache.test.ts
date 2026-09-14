import { afterEach, describe, expect, it, vi } from 'vitest';
import { BINDING_ZK_NONCE } from '../src/transact/environment/zk-config-nonce.js';
import { materializeSelectedZkCircuit } from '../src/transact/zk/circuit-config.js';

const ARTIFACT_BASE = 'https://artifacts.test/zk';

type MemoryCacheStore = Map<string, ArrayBuffer>;

function installMemoryCaches(): () => void {
  const buckets = new Map<string, MemoryCacheStore>();
  const caches = {
    async open(name: string) {
      let store = buckets.get(name);
      if (store === undefined) {
        store = new Map();
        buckets.set(name, store);
      }
      return {
        async match(url: string) {
          const body = store.get(url);
          if (body === undefined) {
            return undefined;
          }
          return new Response(body);
        },
        async put(url: string, response: Response) {
          store.set(url, await response.arrayBuffer());
        },
      };
    },
  };
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: caches,
  });
  return () => {
    delete (globalThis as { caches?: unknown }).caches;
  };
}

function installFetchCounter(): { count: () => number; restore: () => void } {
  const originalFetch = globalThis.fetch;
  let count = 0;
  globalThis.fetch = (async () => {
    count += 1;
    return new Response(new Uint8Array([count]), {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
    });
  }) as typeof fetch;
  return {
    count: () => count,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

describe('browser Cache API for ZK artifacts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves bundled circuits to the zk-sdk when Cache Storage is absent', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    delete (globalThis as { caches?: unknown }).caches;
    const materialized = await materializeSelectedZkCircuit(
      undefined,
      BINDING_ZK_NONCE,
      ARTIFACT_BASE,
    );
    const config = materialized[BINDING_ZK_NONCE.toString()];
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(config).toMatchObject({ circuit: '2x2', nIns: 2, nOuts: 2 });
  });

  it('downloads bundled artifacts once and reuses Cache Storage', async () => {
    const uninstallCaches = installMemoryCaches();
    const fetchCounter = installFetchCounter();
    try {
      const first = await materializeSelectedZkCircuit(
        undefined,
        BINDING_ZK_NONCE,
        ARTIFACT_BASE,
      );
      const second = await materializeSelectedZkCircuit(
        undefined,
        BINDING_ZK_NONCE,
        ARTIFACT_BASE,
      );
      const firstConfig = first[BINDING_ZK_NONCE.toString()];
      const secondConfig = second[BINDING_ZK_NONCE.toString()];
      expect(fetchCounter.count()).toBe(3);
      expect(firstConfig).toBeDefined();
      expect(secondConfig).toBeDefined();
      expect('circuit' in (firstConfig ?? {})).toBe(false);
      expect('provingKey' in (firstConfig ?? {})).toBe(true);
      expect('provingKey' in (secondConfig ?? {})).toBe(true);
    } finally {
      fetchCounter.restore();
      uninstallCaches();
    }
  });
});
