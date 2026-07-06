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
  }: {
    nullifier: string;
    walletPublicKey: string;
  }) => {
    const status = await checkPrivateRecordSpendStatusWithEnvironment({
      transactEnvironment,
      nullifier,
      walletPublicKey,
    });
    return status.spent;
  };
}
