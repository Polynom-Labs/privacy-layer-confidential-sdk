import type { StellarTransactEnvironment } from '../transact/environment/types.js';
import { checkPrivateRecordSpendStatusWithEnvironment } from './network.js';

export function createNullifierSpentChecker(
  transactEnvironment: StellarTransactEnvironment | undefined,
) {
  if (!transactEnvironment) {
    return;
  }
  return async ({
    nullifier,
    walletPublicKey,
    privKeyScalarHex,
    privateAddressStpl1,
  }: {
    nullifier: string;
    walletPublicKey: string;
    privKeyScalarHex?: string;
    privateAddressStpl1?: string;
  }) => {
    const addressHint = privateAddressStpl1?.trim() ?? '';
    const resolvedFromEnsure = transactEnvironment.ensureSenderPrivKeyScalarHex
      ? await transactEnvironment.ensureSenderPrivKeyScalarHex(addressHint)
      : undefined;
    const resolvedFromState =
      addressHint && transactEnvironment.resolveSenderPrivKeyScalarFromState
        ? await transactEnvironment.resolveSenderPrivKeyScalarFromState({
            owner: walletPublicKey,
            privateAddressStpl1: addressHint,
          })
        : undefined;
    const resolvedScalarHex =
      privKeyScalarHex?.trim() ||
      resolvedFromEnsure?.trim() ||
      resolvedFromState?.trim();
    if (!resolvedScalarHex) {
      throw new Error('Spend scalar is required to check owner-bound nullifiers.');
    }
    const status = await checkPrivateRecordSpendStatusWithEnvironment({
      transactEnvironment,
      nullifier,
      walletPublicKey,
      privKeyScalarHex: resolvedScalarHex,
    });
    return status.spent;
  };
}
