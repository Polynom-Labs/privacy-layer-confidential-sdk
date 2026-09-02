import { Buffer } from 'buffer';
import { describe, expect, it, vi } from 'vitest';
import { resolveTransferRecipientFromChain } from '../src/contracts/registry/resolve-transfer-recipient.js';
import type { StellarContractContext } from '../src/contracts/contract-context.js';

const UNREGISTERED_G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const DERIVED_STPL1 = 'stpl1escrowderivedaddress';

vi.mock(
  '../src/transact/escrow/derived-escrow-recipient.js',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../src/transact/escrow/derived-escrow-recipient.js')
      >();
    return {
      ...actual,
      deriveEscrowRecipientFromStellarAddress: vi.fn(
        async (input: { recipientStellarAddress: string }) => ({
          nonceDecimal: '0',
          recipientHi: '1',
          recipientLo: '2',
          recipientStellarAddress: input.recipientStellarAddress,
          privateAddressStpl1: DERIVED_STPL1,
          scalarHex: 'aa'.repeat(32),
        }),
      ),
    };
  },
);

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
    expect(resolved.escrowSend).toBeUndefined();
  });

  it('derives an escrow recipient for an unregistered G-address', async () => {
    const resolved = await resolveTransferRecipientFromChain({
      contractContext: contractContext(),
      recipientStellarAddress: UNREGISTERED_G,
      walletPublicKey: 'G-WALLET',
    });
    expect(resolved.recipientStellarAddress).toBe(UNREGISTERED_G);
    expect(resolved.recipientPrivateAddressStpl1).toBe(DERIVED_STPL1);
    expect(resolved.escrowSend).toEqual({
      nonceDecimal: '0',
      recipientHi: '1',
      recipientLo: '2',
      recipientStellarAddress: UNREGISTERED_G,
    });
    expect(resolved.temporaryRecipientKey).toBeUndefined();
  });

  it('refuses an unregistered recipient that is not a Stellar G-address', async () => {
    await expect(
      resolveTransferRecipientFromChain({
        contractContext: contractContext(),
        recipientStellarAddress: 'stpl1notanaccount',
        walletPublicKey: 'G-WALLET',
      }),
    ).rejects.toThrow(/stellar g-address/i);
  });
});
