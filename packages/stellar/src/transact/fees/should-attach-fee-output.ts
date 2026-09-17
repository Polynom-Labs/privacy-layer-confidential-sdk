import type { OperationKind } from '@arcanetech/privacy-sdk-core';
import type { StellarTransactArtifacts } from '../../types.js';

export type FeeOutputKindInput = {
  kind: OperationKind;
  spendSource?: StellarTransactArtifacts['spendSource'];
  escrowSend?: boolean;
};

export function shouldAttachFeeOutput(input: FeeOutputKindInput): boolean {
  if (input.spendSource === 'escrow' && input.escrowSend !== true) {
    return false;
  }
  return (
    input.kind === 'deposit' || input.kind === 'transfer' || input.kind === 'withdraw'
  );
}

export function feeOutputKindFromPrepared(prepared: {
  kind: OperationKind;
  transactArtifacts?: Pick<StellarTransactArtifacts, 'spendSource' | 'escrowSend'>;
}): FeeOutputKindInput {
  return {
    kind: prepared.kind,
    ...(prepared.transactArtifacts?.spendSource
      ? { spendSource: prepared.transactArtifacts.spendSource }
      : {}),
    ...(prepared.transactArtifacts?.escrowSend ? { escrowSend: true as const } : {}),
  };
}
