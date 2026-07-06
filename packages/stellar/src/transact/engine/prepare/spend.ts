import type { StellarPreparedOperation } from '../../../types.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import { resolveTokenContractId, resolveWalletPublicKey } from './shared.js';

async function prepareSpendOperation(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
): Promise<StellarPreparedOperation> {
  const walletPublicKey = await resolveWalletPublicKey(environment, prepared);
  const tokenAddress = await resolveTokenContractId(environment, prepared.intent.asset);
  return {
    ...prepared,
    transactArtifacts: {
      ...prepared.transactArtifacts,
      tokenAddress,
      walletPublicKey,
      executeFinalizeRequired: true,
    },
  };
}

export const prepareTransferOperation = prepareSpendOperation;
export const prepareWithdrawOperation = prepareSpendOperation;
