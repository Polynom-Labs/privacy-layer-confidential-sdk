import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';
import { resolveTransferRecipientFromChain } from '../src/contracts/registry/resolve-transfer-recipient.js';
import type { StellarContractContext } from '../src/contracts/contract-context.js';

function contractContext(): StellarContractContext {
  return {
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
        return { result: { tag: 'None', values: undefined } };
      },
    }),
  } as unknown as StellarContractContext;
}

describe('resolveTransferRecipientFromChain', () => {
  it('returns the registered private address', async () => {
    const resolved = await resolveTransferRecipientFromChain({
      contractContext: contractContext(),
      recipientStellarAddress: 'G-REGISTERED',
      walletPublicKey: 'G-WALLET',
    });
    expect(resolved.recipientStellarAddress).toBe('G-REGISTERED');
    expect(resolved.recipientPrivateAddressStpl1.startsWith('stpl1')).toBe(true);
    expect(resolved.temporaryRecipientKey).toBeUndefined();
  });

  it('refuses an unregistered recipient', async () => {
    await expect(
      resolveTransferRecipientFromChain({
        contractContext: contractContext(),
        recipientStellarAddress: 'G-MISSING',
        walletPublicKey: 'G-WALLET',
      }),
    ).rejects.toThrow(/unregistered recipients are not supported/i);
  });
});
