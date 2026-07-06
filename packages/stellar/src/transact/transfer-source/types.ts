import type { StellarAddress, StellarPendingClaim } from '../../types.js';

export type StellarPendingClaimSource =
  | { kind: 'pendingClaim'; claimId: string }
  | { kind: 'pendingClaim'; claim: StellarPendingClaim };

export type StellarTransferFromAddress = StellarAddress | StellarPendingClaimSource;

export function isPendingClaimSource(
  from: StellarTransferFromAddress,
): from is StellarPendingClaimSource {
  return typeof from === 'object' && 'kind' in from && from.kind === 'pendingClaim';
}

export function isPrivateAddressTransferFrom(
  from: StellarTransferFromAddress,
): from is StellarAddress {
  return typeof from === 'string';
}
