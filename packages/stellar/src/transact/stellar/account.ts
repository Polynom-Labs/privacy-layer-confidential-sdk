import { StrKey } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';

const MUXED_ACCOUNT_ID_BYTE_LENGTH = 8;
const ED25519_PUBLIC_KEY_BYTE_LENGTH = 32;

function ed25519HexFromGAddress(trimmed: string): string | undefined {
  try {
    const raw = StrKey.decodeEd25519PublicKey(trimmed);
    return Buffer.from(raw).toString('hex');
  } catch {
    return undefined;
  }
}

function ed25519HexFromMuxedAddress(trimmed: string): string | undefined {
  try {
    const raw = StrKey.decodeMed25519PublicKey(trimmed);
    if (raw.length === MUXED_ACCOUNT_ID_BYTE_LENGTH + ED25519_PUBLIC_KEY_BYTE_LENGTH) {
      return raw.subarray(MUXED_ACCOUNT_ID_BYTE_LENGTH).toString('hex');
    }
    if (raw.length === ED25519_PUBLIC_KEY_BYTE_LENGTH) {
      return raw.toString('hex');
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function ed25519PublicKeyHexFromStellarAccount(address: string): string {
  const trimmed = address.trim();
  const fromG = ed25519HexFromGAddress(trimmed);
  if (fromG !== undefined) {
    return fromG;
  }
  const fromMuxed = ed25519HexFromMuxedAddress(trimmed);
  if (fromMuxed !== undefined) {
    return fromMuxed;
  }
  throw new Error('Invalid destination Stellar address');
}
