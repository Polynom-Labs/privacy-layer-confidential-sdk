import { Buffer } from 'buffer';
import { StrKey } from '@stellar/stellar-sdk';

const CONTRACT_ID_BYTE_LENGTH = 32;
const HEX_CHARS_PER_BYTE = 2;
const CONTRACT_ID_HEX_CHAR_LENGTH = CONTRACT_ID_BYTE_LENGTH * HEX_CHARS_PER_BYTE;
const CONTRACT_ID_HEX = /^(?:0x)?([0-9a-f]{64})$/i;

function encodeContractFromHex(hexPayload: string): string {
  return StrKey.encodeContract(Buffer.from(hexPayload, 'hex'));
}

function normalizeSorobanContractId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error('Contract ID is empty');
  }
  if (StrKey.isValidContract(trimmed)) {
    return trimmed;
  }
  const hexMatch = CONTRACT_ID_HEX.exec(trimmed);
  const hexPayload = hexMatch?.[1];
  if (hexPayload !== undefined && hexPayload.length === CONTRACT_ID_HEX_CHAR_LENGTH) {
    return encodeContractFromHex(hexPayload);
  }
  throw new Error(`Invalid Soroban contract address: ${trimmed}`);
}

export function resolveTokenContractId(
  tokenContractRaw: string | null | undefined,
): string {
  const raw = tokenContractRaw?.trim();
  if (!raw) {
    throw new Error('Selected asset has no client contract');
  }
  return normalizeSorobanContractId(raw);
}
