import type { StellarPreparedOperation } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import type { FeeOutputSpec } from '../fees/append-fee-output.js';
import {
  quoteFeeOutputForPrepared,
  remainingAfterRequiredFee,
} from '../fees/quote-fee-output-for-prepared.js';

export async function withdrawFeeProofFields(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  tokenAddress: string;
  available: bigint;
  withdrawFrom: string;
}): Promise<{
  feeOutput?: FeeOutputSpec;
  changePrivateAddressStpl1?: string;
}> {
  const feeOutput = await quoteFeeOutputForPrepared({
    prepared: input.prepared,
    environment: input.environment,
    tokenAddress: input.tokenAddress,
  });
  const changeStroops = remainingAfterRequiredFee({
    available: input.available,
    instructed: input.prepared.intent.amount,
    requiredFee: feeOutput?.requiredFee ?? 0n,
  });
  return {
    ...(feeOutput ? { feeOutput } : {}),
    ...(changeStroops > 0n ? { changePrivateAddressStpl1: input.withdrawFrom } : {}),
  };
}
