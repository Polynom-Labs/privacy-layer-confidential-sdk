import type { StellarPreparedOperation } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import type { FeeOutputSpec } from './append-fee-output.js';
import { quoteRequiredFee } from './quote-required-fee.js';
import {
  feeOutputKindFromPrepared,
  shouldAttachFeeOutput,
} from './should-attach-fee-output.js';

function instructedMinorUnits(prepared: StellarPreparedOperation): string {
  return prepared.intent.amount.toString();
}

function quoteRequestForPrepared(input: {
  prepared: StellarPreparedOperation;
  tokenAddress: string;
}) {
  const amount = instructedMinorUnits(input.prepared);
  if (input.prepared.kind === 'deposit') {
    return {
      feeAsset: input.tokenAddress,
      publicDepositAmount: amount,
      spendsNotes: false,
    };
  }
  if (input.prepared.kind === 'withdraw') {
    return {
      feeAsset: input.tokenAddress,
      publicWithdrawalAmount: amount,
      spendsNotes: true,
    };
  }
  return {
    feeAsset: input.tokenAddress,
    transferInstructedAmount: amount,
    spendsNotes: true,
  };
}

export async function quoteFeeOutputForPrepared(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  tokenAddress: string;
}): Promise<FeeOutputSpec | undefined> {
  if (!shouldAttachFeeOutput(feeOutputKindFromPrepared(input.prepared))) {
    return undefined;
  }
  const quote = await quoteRequiredFee({
    transactEnvironment: input.environment,
    request: quoteRequestForPrepared(input),
  });
  if (quote.requiredFee <= 0n) {
    return undefined;
  }
  return {
    requiredFee: quote.requiredFee,
    feeCollectorPrivateAddress: quote.feeCollectorPrivateAddress,
  };
}

export function remainingAfterRequiredFee(input: {
  available: bigint;
  instructed: bigint;
  requiredFee: bigint;
}): bigint {
  const remaining = input.available - input.instructed - input.requiredFee;
  if (remaining < 0n) {
    throw new Error('Instructed amount and Required Fee exceed available note value');
  }
  return remaining;
}
