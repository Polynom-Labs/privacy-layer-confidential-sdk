import type { CoinData } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { assetLegToTokenAddress } from '../proofs/transaction-input.js';
import {
  deriveEscrowRecipientFromStellarAddress,
  type DerivedEscrowKeyFn,
} from './derived-escrow-recipient.js';

const FIELD_HEX_LENGTH = 64;

export type EscrowOutputNoteCiphertextEvent = {
  outputIndex: number;
  commitmentHashHex: string;
  createdEphemeralKey: readonly [string, string];
  ciphertext: readonly string[];
  tag: string;
};

export type ReconstructedEscrowNote = {
  coin: CoinData;
  scalarHex: string;
  privateAddressStpl1: string;
  recipientHi: string;
  recipientLo: string;
  nonceDecimal: string;
  tokenAddress: string;
  commitmentHex: string;
};

export type DecryptEscrowOutputNote = (input: {
  recipientScalarHex: string;
  commitmentHashHex: string;
  createdEphemeralKey: readonly [string, string];
  ciphertext: readonly string[];
  tag: string;
  ownerMode?: bigint;
}) => Promise<{
  value: string;
  assetHi: string;
  assetLo: string;
  nullifier: string;
  secret: string;
  applicationId: string;
  commitmentHex: string;
  commitmentMatches: boolean;
}>;

function hexToDecimal(hex: string): string {
  const clean = hex.trim().replace(/^0x/u, '');
  return BigInt(`0x${clean || '0'}`).toString();
}

function padFieldHex(value: string): string {
  return value.replace(/^0x/iu, '').padStart(FIELD_HEX_LENGTH, '0');
}

async function defaultDecryptOutputNote(
  input: Parameters<DecryptEscrowOutputNote>[0],
): ReturnType<DecryptEscrowOutputNote> {
  const module = (await import('@arcanetech/stellar-privacy-pool-zk-sdk')) as {
    decryptOutputNoteEvent?: DecryptEscrowOutputNote;
  };
  if (typeof module.decryptOutputNoteEvent !== 'function') {
    throw new TypeError('Output note decryption is not available.');
  }
  return module.decryptOutputNoteEvent(input);
}

export async function reconstructEscrowNote(input: {
  claimantAddress: string;
  nonceDecimal: string;
  seq: number;
  events: readonly EscrowOutputNoteCiphertextEvent[];
  decrypt?: DecryptEscrowOutputNote;
  deriveKey?: DerivedEscrowKeyFn;
}): Promise<ReconstructedEscrowNote> {
  const derived = await deriveEscrowRecipientFromStellarAddress({
    recipientStellarAddress: input.claimantAddress,
    nonceDecimal: input.nonceDecimal,
    ...(input.deriveKey ? { deriveKey: input.deriveKey } : {}),
  });
  const event = input.events.find((entry) => entry.outputIndex === input.seq);
  if (!event) {
    throw new Error('Escrow output note event was not found for this sequence.');
  }
  const decrypt = input.decrypt ?? defaultDecryptOutputNote;
  const decrypted = await decrypt({
    recipientScalarHex: derived.scalarHex,
    commitmentHashHex: event.commitmentHashHex,
    createdEphemeralKey: event.createdEphemeralKey,
    ciphertext: event.ciphertext,
    tag: event.tag,
    ownerMode: 1n,
  });
  return {
    coin: {
      value: decrypted.value,
      nullifier: decrypted.nullifier,
      secret: decrypted.secret,
      commitment: hexToDecimal(decrypted.commitmentHex),
      asset_hi: decrypted.assetHi,
      asset_lo: decrypted.assetLo,
      application_id: decrypted.applicationId,
    },
    scalarHex: derived.scalarHex,
    privateAddressStpl1: derived.privateAddressStpl1,
    recipientHi: derived.recipientHi,
    recipientLo: derived.recipientLo,
    nonceDecimal: derived.nonceDecimal,
    tokenAddress: assetLegToTokenAddress(decrypted.assetHi, decrypted.assetLo),
    commitmentHex: padFieldHex(decrypted.commitmentHex),
  };
}
