import type { StellarPreparedOperation } from '../../../types.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import { prepareConfidentialTransferProof } from '../../proofs/confidential/single.js';

function isPublicRecipientTransfer(prepared: StellarPreparedOperation): boolean {
  return (
    prepared.kind === 'transfer' &&
    prepared.intent.disclosure.recipientAddress === 'public'
  );
}

export async function resolveTransferRecipientForExecute(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
  walletPublicKey: string,
) {
  if (!isPublicRecipientTransfer(prepared)) {
    return {
      recipientPrivateAddressStpl1: prepared.intent.to.trim(),
    };
  }
  if (!environment.resolveTransferRecipientAtExecute) {
    throw new Error('Transfer recipient resolver is not configured.');
  }
  return environment.resolveTransferRecipientAtExecute({
    recipientStellarAddress: prepared.intent.to.trim(),
    walletPublicKey,
  });
}

export async function resolveTransferOnboardingAtExecute(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  recipient: Awaited<ReturnType<typeof resolveTransferRecipientForExecute>>;
  recipientCoin: Awaited<
    ReturnType<typeof prepareConfidentialTransferProof>
  >['recipientCoin']['coin'];
  tokenAddress: string;
}) {
  if (input.prepared.transactArtifacts?.onboarding) {
    return input.prepared.transactArtifacts.onboarding;
  }
  if (
    !input.recipient.temporaryRecipientKey ||
    !input.environment.buildTransferOnboardingAtExecute
  ) {
    return;
  }
  return input.environment.buildTransferOnboardingAtExecute({
    ownerStellarAddress:
      input.recipient.recipientStellarAddress ?? input.prepared.intent.to.trim(),
    temporaryRecipientKey: input.recipient.temporaryRecipientKey,
    recipientNote: {
      tokenAddress: input.tokenAddress,
      nullifier: input.recipientCoin.nullifier,
      secret: input.recipientCoin.secret,
      value: input.recipientCoin.value,
    },
  });
}
