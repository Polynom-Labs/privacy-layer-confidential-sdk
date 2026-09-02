import type { StellarPreparedOperation } from '../../../types.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';

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
