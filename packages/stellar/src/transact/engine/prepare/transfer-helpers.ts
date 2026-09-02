import { StrKey } from '@stellar/stellar-sdk';
import type { StellarPreparedOperation } from '../../../types.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';

function isStellarAccountRecipient(prepared: StellarPreparedOperation): boolean {
  return (
    prepared.kind === 'transfer' &&
    StrKey.isValidEd25519PublicKey(prepared.intent.to.trim())
  );
}

export async function stampEscrowSendArtifacts(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
  walletPublicKey: string,
): Promise<
  Pick<
    NonNullable<StellarPreparedOperation['transactArtifacts']>,
    'escrowSend' | 'spendSource'
  >
> {
  if (!isStellarAccountRecipient(prepared)) {
    return {};
  }
  if (!environment.resolveTransferRecipientAtExecute) {
    return {};
  }
  const recipient = await environment.resolveTransferRecipientAtExecute({
    recipientStellarAddress: prepared.intent.to.trim(),
    walletPublicKey,
  });
  if (!recipient.escrowSend) {
    return {};
  }
  return { escrowSend: true, spendSource: 'escrow' };
}

export async function resolveTransferRecipientForExecute(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
  walletPublicKey: string,
) {
  if (!isStellarAccountRecipient(prepared)) {
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
