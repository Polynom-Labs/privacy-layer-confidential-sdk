import type { StellarTransferFromAddress } from './types.js';

export function readTransferFromPrivateAddress(
  from: StellarTransferFromAddress,
): string {
  return from.trim();
}
