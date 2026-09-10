import { describe, expect, it } from 'vitest';
import { ed25519PubkeyPayloadHexToWithdrawFrDecimals } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { buildWithdrawPublicInput } from '../src/transact/proofs/withdraw/helpers.js';
import { ed25519PublicKeyHexFromStellarAccount } from '../src/transact/stellar/account.js';
import {
  publicWithdrawAddressLimbs,
  withTokenAddressPublicInputs,
} from '../src/transact/proofs/transaction-input.js';

const TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const DESTINATION = 'GBXI7263ER2GILUOFLOUK6UXSZ5EGTC7SXFVDP4BPLFQXCZHVM54M5GR';
const PRIV_KEY_SCALAR_HEX =
  '304c151b0d104df797d473cc6ee1e85769d615744d0ff7eb1bfb8d10473fc314';

function destinationLimbs(address: string): { hi: string; lo: string } {
  return ed25519PubkeyPayloadHexToWithdrawFrDecimals(
    ed25519PublicKeyHexFromStellarAccount(address),
  );
}

describe('public withdraw address limbs', () => {
  it('zeros the destination when the public withdrawal amount is 0', () => {
    const { hi, lo } = destinationLimbs(DESTINATION);
    expect(
      publicWithdrawAddressLimbs({
        publicWithdrawalAmount: '0',
        destinationHi: hi,
        destinationLo: lo,
      }),
    ).toEqual({ withdrawAddressHi: '0', withdrawAddressLo: '0' });
  });

  it('publishes the destination only for a positive public withdrawal', () => {
    const { hi, lo } = destinationLimbs(DESTINATION);
    expect(
      publicWithdrawAddressLimbs({
        publicWithdrawalAmount: '200000000',
        destinationHi: hi,
        destinationLo: lo,
      }),
    ).toEqual({ withdrawAddressHi: hi, withdrawAddressLo: lo });
  });

  it('defaults omitted withdraw limbs to zero on deposit-style public input', () => {
    const publicInput = withTokenAddressPublicInputs(
      { stateRoot: '1', privKeyScalar: '2' },
      TOKEN,
    );
    expect(publicInput.withdrawAddressHi).toBe('0');
    expect(publicInput.withdrawAddressLo).toBe('0');
  });

  it('keeps the destination in withdraw public input for a public unshield', () => {
    const { hi, lo } = destinationLimbs(DESTINATION);
    const publicInput = buildWithdrawPublicInput({
      stateRoot: '1',
      destinationStellarAddress: DESTINATION,
      privKeyScalarHex: PRIV_KEY_SCALAR_HEX,
      tokenAddress: TOKEN,
      publicWithdrawalAmount: '200000000',
    });
    expect(publicInput.withdrawAddressHi).toBe(hi);
    expect(publicInput.withdrawAddressLo).toBe(lo);
  });

  it('zeros withdraw public input when the public withdrawal amount is 0', () => {
    const publicInput = buildWithdrawPublicInput({
      stateRoot: '1',
      destinationStellarAddress: DESTINATION,
      privKeyScalarHex: PRIV_KEY_SCALAR_HEX,
      tokenAddress: TOKEN,
      publicWithdrawalAmount: '0',
    });
    expect(publicInput.withdrawAddressHi).toBe('0');
    expect(publicInput.withdrawAddressLo).toBe('0');
  });
});
