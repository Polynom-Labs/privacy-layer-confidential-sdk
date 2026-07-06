import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';
import { readRegistryLookupFromChain } from '../src/contracts/registry/registry-domain-service.js';
import type { StellarContractContext } from '../src/contracts/contract-context.js';

describe('readRegistryLookupFromChain', () => {
  it('normalizes direct registry records and Soroban Option payloads', async () => {
    const contractContext = {
      network: {
        registryContract: 'C-REGISTRY',
        networkPassphrase: 'Test',
        rpcUrl: 'https://example.invalid',
      },
      createRegistryClient: () => ({
        get_private_address: async ({ owner }: { owner: string }) => {
          if (owner === 'G-REGISTERED') {
            return {
              result: {
                owner: 'G-REGISTERED',
                public_key_x: Buffer.from('11'.repeat(32), 'hex'),
                public_key_y: Buffer.from('22'.repeat(32), 'hex'),
                updated_at_ledger: 42,
              },
            };
          }
          if (owner === 'G-OPTION') {
            return {
              result: {
                tag: 'Some',
                values: [
                  {
                    owner: 'G-OPTION',
                    public_key_x: Buffer.from('aa'.repeat(32), 'hex'),
                    public_key_y: Buffer.from('bb'.repeat(32), 'hex'),
                    updated_at_ledger: 7,
                  },
                ],
              },
            };
          }
          return { result: { tag: 'None', values: undefined } };
        },
      }),
    } as unknown as StellarContractContext;

    const direct = await readRegistryLookupFromChain({
      contractContext,
      owner: 'G-REGISTERED',
      walletPublicKey: 'G-WALLET',
    });
    expect(direct.status).toBe('registered');
    expect(direct.privateAddressStpl1?.startsWith('stpl1')).toBe(true);

    const option = await readRegistryLookupFromChain({
      contractContext,
      owner: 'G-OPTION',
      walletPublicKey: 'G-WALLET',
    });
    expect(option.status).toBe('registered');
    expect(option.updatedAtLedger).toBe(7);

    const unregistered = await readRegistryLookupFromChain({
      contractContext,
      owner: 'G-MISSING',
      walletPublicKey: 'G-WALLET',
    });
    expect(unregistered.status).toBe('unregistered');
  });
});
