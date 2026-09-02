import type { StellarPreparedOperation } from '../../../types.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import { resolveTokenContractId, resolveWalletPublicKey } from './shared.js';
import { stampEscrowSendArtifacts } from './transfer-helpers.js';

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
      ...(await stampEscrowSendArtifacts(prepared, environment, walletPublicKey)),
    },
  };
}

export const prepareTransferOperation = prepareSpendOperation;
export const prepareWithdrawOperation = prepareSpendOperation;
