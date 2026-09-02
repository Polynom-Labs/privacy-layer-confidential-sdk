import { insufficientStateError } from '@arcanetech/privacy-sdk-core';

export function assertEscrowSweepClaimant(input: {
  walletPublicKey: string;
  claimantAddress: string;
}): void {
  const walletPublicKey = input.walletPublicKey.trim();
  const claimantAddress = input.claimantAddress.trim();
  if (!walletPublicKey || walletPublicKey !== claimantAddress) {
    const error = insufficientStateError(
      'escrow_sweep_claimant_mismatch',
      'Escrow sweep requires the connected account that owns the note.',
      { walletPublicKey, claimantAddress },
    );
    throw new Error(error.message, { cause: error });
  }
}
