import { describe, expect, it, vi } from 'vitest';
import { createNullifierSpentChecker } from '../src/client/nullifier-checker.js';
import type { StellarTransactEnvironment } from '../src/transact/environment/types.js';

vi.mock('../src/client/network.js', () => ({
  checkPrivateRecordSpendStatusWithEnvironment: vi.fn(async () => ({
    spent: false,
  })),
}));

function environmentStub(
  overrides: Partial<StellarTransactEnvironment> = {},
): StellarTransactEnvironment {
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
    ...overrides,
  };
}

describe('createNullifierSpentChecker', () => {
  it('resolves the spend scalar from ensureSenderPrivKeyScalarHex without a private address', async () => {
    const checker = createNullifierSpentChecker(
      environmentStub({
        ensureSenderPrivKeyScalarHex: async () => 'ab'.repeat(32),
      }),
    );
    await expect(
      checker?.({
        nullifier: '11',
        walletPublicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      }),
    ).resolves.toBe(false);
  });
});
