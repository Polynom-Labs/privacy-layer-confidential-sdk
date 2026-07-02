import { describe, expect, it, vi } from 'vitest';
import {
  createStellarPrivacyClientFromResolvedConfig,
  resolveStellarPrivacyClientConfig,
} from '../src/stellar-privacy-client.js';
import { createFakeTransactEngine } from '../src/testing/index.js';
import type {
  StellarPolicyAdapter,
  StellarPrivateRecord,
  StellarPrivacyClientConfigBase,
  StellarStorageAdapter,
  StellarWalletAdapter,
} from '../src/types.js';

const disclosure = {
  senderAddress: 'private' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'private' as const,
  amount: 'private' as const,
};

describe('createStellarPrivacyClient config validation', () => {
  it('rejects missing dependencies', async () => {
    const resolved = await resolveStellarPrivacyClientConfig(
      {} as StellarPrivacyClientConfigBase,
      async () => createFakeTransactEngine(),
    );

    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(
        resolved.result.errors.some((error) => error.code === 'missing_dependency'),
      ).toBe(true);
    }
  });
});

describe('StellarPrivacyClient preparation', () => {
  it('rejects unsupported withdraw disclosure combinations', async () => {
    const client = await createTestClient();
    const result = await client.withdraw({
      from: 'private-sender',
      to: 'public-recipient',
      asset: 'USDC',
      amount: 10n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'private',
        amount: 'private',
      },
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('unsupported_disclosure');
    }
  });

  it('returns insufficient_state when storage has no private records', async () => {
    const client = await createTestClient({ records: [] });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
    }
  });

  it('rejects when available records total is below requested amount', async () => {
    const client = await createTestClient({
      records: [
        createRecord('private-sender', 'USDC', 10n, 'a'),
        createRecord('private-sender', 'USDC', 10n, 'b'),
      ],
    });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
      expect(result.errors[0]?.reason).toBe('missing_private_records');
    }
  });

  it('consumes multiple private records when one note is insufficient', async () => {
    const recordA = createRecord('private-sender', 'USDC', 10n, 'a');
    const recordB = createRecord('private-sender', 'USDC', 20n, 'b');
    const client = await createTestClient({ records: [recordA, recordB] });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.consumedRecords).toHaveLength(2);
    expect(result.prepared.consumedRecords.map((record) => record.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('creates sender change output when input exceeds transfer amount', async () => {
    const record = createRecord('private-sender', 'USDC', 100n, 'a');
    const client = await createTestClient({ records: [record] });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.outputRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: 'private-recipient', amount: 25n }),
        expect.objectContaining({ owner: 'private-sender', amount: 75n }),
      ]),
    );
  });

  it('creates sender change output for public withdraw with surplus input', async () => {
    const record = createRecord('private-sender', 'USDC', 100n, 'a');
    const client = await createTestClient({ records: [record] });
    const result = await client.withdraw({
      from: 'private-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 25n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.outputRecords).toEqual([
      expect.objectContaining({ owner: 'private-sender', amount: 75n }),
    ]);
  });
});

describe('StellarPrivacyClient execution', () => {
  it('executes deposit happy path and commits storage', async () => {
    const storage = createStorage([createRecord('owner', 'USDC', 100n)]);
    const client = await createTestClient({ storage });
    const result = await client.deposit({
      from: 'G-SENDER',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 100n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    const receipt = await result.execute();
    expect(receipt.confirmed).toBe(true);
    expect(storage.saved).toHaveLength(1);
  });

  it('executes transfer and marks consumed records after confirmation', async () => {
    const record = createRecord('private-sender', 'USDC', 25n);
    const storage = createStorage([record]);
    const client = await createTestClient({ storage });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    await result.execute();
    expect(storage.used).toEqual([record]);
    expect(storage.saved).toHaveLength(1);
  });

  it('does not commit storage when submission fails', async () => {
    const record = createRecord('private-sender', 'USDC', 25n);
    const storage = createStorage([record]);
    const client = await createTestClient({
      storage,
      engine: createFakeTransactEngine({
        submit: async () => {
          throw new Error('submission failed');
        },
      }),
    });

    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    await expect(result.execute()).rejects.toMatchObject({ code: 'execution_error' });
    expect(storage.used).toHaveLength(0);
    expect(storage.saved).toHaveLength(0);
  });

  it('reports storageCommit failure after confirmed submit', async () => {
    const record = createRecord('private-sender', 'USDC', 25n);
    const baseStorage = createStorage([record]);
    const storage: StellarStorageAdapter & {
      saved: StellarPrivateRecord[];
      used: StellarPrivateRecord[];
    } = {
      ...baseStorage,
      savePrivateRecords: async () => {
        throw new Error('storage failed');
      },
    };
    const client = await createTestClient({ storage });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    const errorEvents: Array<{ stage?: string }> = [];
    await expect(
      result.execute({
        onEvent: (event) => {
          if (event.status === 'error') {
            errorEvents.push(event);
          }
        },
      }),
    ).rejects.toMatchObject({
      code: 'execution_error',
      stage: 'storageCommit',
      details: {
        receipt: expect.objectContaining({ confirmed: true }),
      },
    });
    expect(errorEvents.some((event) => event.stage === 'storageCommit')).toBe(true);
    expect(storage.used).toHaveLength(0);
    expect(storage.saved).toHaveLength(0);
  });

  it('emits progress events in stage order', async () => {
    const events: string[] = [];
    const client = await createTestClient();
    const result = await client.deposit({
      from: 'G-SENDER',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 100n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    if (result.status !== 'prepared') {
      throw new Error('Expected prepared operation');
    }

    await result.execute({
      onEvent: (event) => {
        if (event.status === 'begin') {
          events.push(event.stage);
        }
      },
    });

    expect(events).toEqual([
      'validation',
      'stateRead',
      'authorization',
      'preparation',
      'policyCheck',
      'submission',
      'confirmation',
      'storageCommit',
    ]);
  });

  it('stops execution when abort signal is already aborted', async () => {
    const submit = vi.fn(async () => ({ operationId: 'x', confirmed: true }));
    const client = await createTestClient({
      engine: createFakeTransactEngine({ submit }),
    });
    const result = await client.deposit({
      from: 'G-SENDER',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 100n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    if (result.status !== 'prepared') {
      throw new Error('Expected prepared operation');
    }

    const controller = new AbortController();
    controller.abort();
    await expect(result.execute({ signal: controller.signal })).rejects.toThrow(
      /aborted/i,
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects policy failures before submission', async () => {
    const policy: StellarPolicyAdapter = {
      inspectOperation: async () => {
        throw new Error('policy rejected');
      },
    };
    const submit = vi.fn();
    const client = await createTestClient({
      policy,
      engine: createFakeTransactEngine({ submit }),
    });

    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('rejected');
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('entrypoints', () => {
  it('browser source does not import node filesystem modules', async () => {
    const { readFile } = await import('node:fs/promises');
    const browserSources = [
      '../src/index.ts',
      '../src/create-stellar-privacy-client.ts',
      '../src/transact-engine.browser.ts',
    ];

    for (const sourcePath of browserSources) {
      const source = await readFile(new URL(sourcePath, import.meta.url), 'utf8');
      expect(source).not.toContain("from 'node:fs");
      expect(source).not.toContain('from "node:fs');
      expect(source).not.toContain("from 'fs/promises'");
    }
  });

  it('browser bundle does not reference node filesystem modules', async () => {
    const { readFile, readdir } = await import('node:fs/promises');
    const distributionRoot = new URL('../dist/', import.meta.url);
    const entries = await readdir(distributionRoot, { withFileTypes: true });
    const browserArtifacts = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .filter((entry) => entry.name !== 'node.js')
      .map((entry) => entry.name);

    for (const fileName of browserArtifacts) {
      const source = await readFile(new URL(fileName, distributionRoot), 'utf8');
      expect(source).not.toContain('node:fs');
      expect(source).not.toContain('fs/promises');
      expect(source).not.toContain('readFile(');
    }
  });

  it('node entry loads assets from paths', async () => {
    const { loadNodeAssets } = await import('../src/load-node-assets.js');
    const assets = await loadNodeAssets({
      sdkWasmPath: new URL('../test/fixtures/tiny.wasm', import.meta.url).pathname,
      circuitWasmPath: new URL('../test/fixtures/tiny.wasm', import.meta.url).pathname,
      provingKeyPath: new URL('../test/fixtures/tiny.zkey', import.meta.url).pathname,
    });
    expect(assets.sdkWasm.byteLength).toBeGreaterThan(0);
  });
});

async function createTestClient(
  overrides: {
    storage?: StellarStorageAdapter;
    policy?: StellarPolicyAdapter;
    engine?: ReturnType<typeof createFakeTransactEngine>;
    records?: StellarPrivateRecord[];
  } = {},
) {
  const storage = overrides.storage ?? createStorage(overrides.records ?? []);
  const wallet: StellarWalletAdapter = {
    getAddress: async () => 'G-SENDER',
    authorizeMessage: async () => new Uint8Array([1]),
    signTransactionPayload: async (payload) => ({ ...payload, signed: true }),
  };

  const resolved = await resolveStellarPrivacyClientConfig(
    {
      network: {
        id: 'testnet',
        rpcUrl: 'https://example.invalid',
        networkPassphrase: 'Test',
        poolContract: 'C-POOL',
        registryContract: 'C-REGISTRY',
        applicationId: '101',
      },
      wallet,
      storage,
      assets: {
        sdkWasm: new ArrayBuffer(8),
        circuitWasm: new ArrayBuffer(8),
        provingKey: new ArrayBuffer(8),
      },
      transactEngine: overrides.engine ?? createFakeTransactEngine(),
      ...(overrides.policy ? { policy: overrides.policy } : {}),
    },
    async () => overrides.engine ?? createFakeTransactEngine(),
  );

  if (!resolved.ok) {
    throw new Error('Expected valid test client config');
  }

  return createStellarPrivacyClientFromResolvedConfig(resolved.config);
}

function createRecord(
  owner: string,
  asset: string,
  amount: bigint,
  id = crypto.randomUUID(),
): StellarPrivateRecord {
  return {
    id,
    owner,
    asset,
    amount,
    consumed: false,
  };
}

function createStorage(records: StellarPrivateRecord[]): StellarStorageAdapter & {
  saved: StellarPrivateRecord[];
  used: StellarPrivateRecord[];
} {
  const state = [...records];
  const saved: StellarPrivateRecord[] = [];
  const used: StellarPrivateRecord[] = [];

  return {
    saved,
    used,
    listPrivateRecords: async ({ owner, asset }) =>
      state.filter(
        (record) =>
          record.owner === owner && record.asset === asset && !record.consumed,
      ),
    savePrivateRecords: async (recordsToSave) => {
      saved.push(...recordsToSave);
      state.push(...recordsToSave);
    },
    markPrivateRecordsUsed: async (recordsToUse) => {
      used.push(...recordsToUse);
      for (const record of recordsToUse) {
        record.consumed = true;
      }
    },
  };
}
