import type { StellarAddress } from '../../types.js';

export type StellarTransferFromAddress = StellarAddress;

export function isPrivateAddressTransferFrom(
  from: StellarTransferFromAddress,
): from is StellarAddress {
  return typeof from === 'string';
}
