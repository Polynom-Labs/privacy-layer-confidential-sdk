import { BN254_BABYJUB_SCALAR_MAX_EXCLUSIVE } from '@auditable/privacy-pool-zk-sdk';

const SCALAR_HEX_CHAR_LENGTH = 64;
const DECIMAL_RADIX = 10;
const BIGINT_ONE = 1n;

function normalizeRecipientScalarHex(hexInput: string): string {
  const trimmed = hexInput.trim().replace(/^0x/iu, '');
  if (!/^[0-9a-f]*$/iu.test(trimmed)) {
    throw new Error('recipient scalar hex must be hexadecimal');
  }
  const withLeadingNibble = trimmed.length % 2 === 0 ? trimmed : `0${trimmed}`;
  const lower = withLeadingNibble.toLowerCase();
  const padded = lower
    .padStart(SCALAR_HEX_CHAR_LENGTH, '0')
    .slice(-SCALAR_HEX_CHAR_LENGTH);
  if (padded.length !== SCALAR_HEX_CHAR_LENGTH) {
    throw new Error(
      `recipient scalar hex must fit 32 bytes (${SCALAR_HEX_CHAR_LENGTH} hex chars)`,
    );
  }
  return padded;
}

export function privKeyScalarDecimalFromRecipientScalarHex(hexInput: string): string {
  const hex = normalizeRecipientScalarHex(hexInput);
  const value = BigInt(`0x${hex}`);
  const mask = BN254_BABYJUB_SCALAR_MAX_EXCLUSIVE - BIGINT_ONE;
  return (value & mask).toString(DECIMAL_RADIX);
}
