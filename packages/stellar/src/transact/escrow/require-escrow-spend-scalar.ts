import type { StellarTransactArtifacts } from '../../types.js';

export function isEscrowSweepSpend(
  artifacts: StellarTransactArtifacts | undefined,
): boolean {
  return artifacts?.spendSource === 'escrow' && artifacts.escrowSend !== true;
}

export function requireEscrowSpendScalarHex(
  artifacts: StellarTransactArtifacts | undefined,
): string {
  if (!isEscrowSweepSpend(artifacts)) {
    throw new Error('Escrow sweep requires spendSource escrow.');
  }
  const hex = artifacts?.escrowSpendScalarHex?.trim();
  if (!hex) {
    throw new Error('Escrow sweep requires the reconstructed note owner scalar.');
  }
  return hex;
}

export function nullifierCheckSpendScalarHex(
  artifacts: StellarTransactArtifacts | undefined,
): string | undefined {
  if (!isEscrowSweepSpend(artifacts)) {
    return undefined;
  }
  return requireEscrowSpendScalarHex(artifacts);
}
