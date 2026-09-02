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
    const resolvedScalarHex =
      privKeyScalarHex?.trim() ||
      (privateAddressStpl1?.trim() && transactEnvironment.ensureSenderPrivKeyScalarHex
        ? await transactEnvironment.ensureSenderPrivKeyScalarHex(privateAddressStpl1)
        : undefined);
    if (!resolvedScalarHex?.trim()) {
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
