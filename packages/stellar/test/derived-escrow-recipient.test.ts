import { describe, expect, it } from 'vitest';
import { deriveEscrowRecipientFromStellarAddress } from '../src/transact/escrow/derived-escrow-recipient.js';
import { encodePrivateAddressFromHexCoordinates } from '../src/transact/private-address/codec.js';

const FIXED_G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const DERIVED_ESCROW_FIXTURE = {
  scalarHex: '304c151b0d104df797d473cc6ee1e85769d615744d0ff7eb1bfb8d10473fc314',
  pointXHex: '1212fec80b675a524b5ffa32723fdb17e5e7923e4d9609bff8cc56a472b6e35f',
  pointYHex: '0d2002e37a3f40a3aee753a5e517b356371958198b6c735703ad2756d674d208',
} as const;

describe('deriveEscrowRecipientFromStellarAddress', () => {
  it('pins exactly one recipient by deriving the escrow key from nonce and G-address limbs', async () => {
    let seenHi: bigint | undefined;
    let seenLo: bigint | undefined;
    const derived = await deriveEscrowRecipientFromStellarAddress({
      recipientStellarAddress: FIXED_G,
      nonceDecimal: '0',
      deriveKey: async (nonce, recipientHi, recipientLo) => {
        expect(nonce).toBe(0n);
        seenHi = recipientHi;
        seenLo = recipientLo;
        return DERIVED_ESCROW_FIXTURE;
      },
    });

    expect(seenHi).toBe(BigInt(derived.recipientHi));
    expect(seenLo).toBe(BigInt(derived.recipientLo));

    expect(derived.recipientStellarAddress).toBe(FIXED_G);
    expect(derived.privateAddressStpl1).toBe(
      encodePrivateAddressFromHexCoordinates(
        DERIVED_ESCROW_FIXTURE.pointXHex,
        DERIVED_ESCROW_FIXTURE.pointYHex,
      ),
    );
    expect(derived.scalarHex).toBe(DERIVED_ESCROW_FIXTURE.scalarHex);
  });

  it('refuses a non-account recipient so the sender cannot name anyone else', async () => {
    await expect(
      deriveEscrowRecipientFromStellarAddress({
        recipientStellarAddress: 'stpl1notanaccount',
      }),
    ).rejects.toThrow(/stellar g-address/i);
  });
});
