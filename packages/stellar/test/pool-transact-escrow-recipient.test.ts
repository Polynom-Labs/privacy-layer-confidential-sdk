import { describe, expect, it, vi } from 'vitest';
import type { PoolTransactClient } from '../src/transact/pool/types.js';
import { submitPoolTransact } from '../src/transact/submit/pool-transact.js';
import type { StellarTransactEnvironment } from '../src/transact/environment/types.js';

vi.mock('../src/transact/submit/ttl-preflight.js', () => ({
  runTtlPreflight: vi.fn(async () => undefined),
}));

vi.mock('../src/transact/submit/zk-config-ttl.js', () => ({
  extendZkConfigTtlIfNeeded: vi.fn(async () => undefined),
}));

const SIGNATURE_HEX = 'ab'.repeat(64);

function environmentStub(): StellarTransactEnvironment {
  return {
    network: {
      id: 'testnet',
      rpcUrl: 'https://example.invalid',
      networkPassphrase: 'Test SDF Network ; September 2015',
      poolContract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      registryContract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      applicationId: '11111111-1111-4111-8111-111111111111',
    },
    kyt: {
      apiBaseUrl: 'https://kyt.invalid',
      kytPassageRegistryContract:
        'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    },
  };
}

async function captureTransactArgs(escrowRecipient?: string) {
  let captured: Parameters<PoolTransactClient['transact']>[0] | undefined;
  const contractClient: PoolTransactClient = {
    get_merkle_root: async () => ({ result: Buffer.alloc(32) }),
    get_commitments: async () => ({ result: [] }),
    get_leaf_ephemeral: async () => ({
      result: { x: Buffer.alloc(32), y: Buffer.alloc(32) },
    }),
    is_nulifier_hash_consumed: async () => ({ result: false }),
    transact: async (parameters) => {
      captured = parameters;
      return {
        signAndSend: async () => ({
          sendTransactionResponse: { hash: 'hash' },
        }),
      };
    },
  };
  await submitPoolTransact({
    contractClient,
    contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    from: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    nonce: 0n,
    proofHex: 'aa',
    publicHex: 'bb',
    approval: {
      status: 'approved',
      passageId: 'cc'.repeat(32),
      signature: SIGNATURE_HEX,
      expiresAtLedger: 1,
    },
    networkPassphrase: 'Test SDF Network ; September 2015',
    sorobanRpcUrl: 'https://example.invalid',
    transactEnvironment: environmentStub(),
    ...(escrowRecipient ? { escrowRecipient } : {}),
  });
  return captured;
}

describe('submitPoolTransact escrow_recipient', () => {
  it('always includes escrow_recipient so the generated client can encode None', async () => {
    const args = await captureTransactArgs();
    expect(args).toBeDefined();
    expect(Object.hasOwn(args ?? {}, 'escrow_recipient')).toBe(true);
    expect(args?.escrow_recipient).toBeUndefined();
  });

  it('forwards a registered escrow recipient', async () => {
    const recipient = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const args = await captureTransactArgs(recipient);
    expect(args?.escrow_recipient).toBe(recipient);
  });
});
