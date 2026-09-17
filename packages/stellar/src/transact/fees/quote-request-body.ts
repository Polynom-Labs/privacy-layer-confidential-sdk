export type FeeQuoteRequest = {
  feeAsset: string;
  publicDepositAmount?: string;
  transferInstructedAmount?: string;
  publicWithdrawalAmount?: string;
  spendsNotes: boolean;
};

export type FeeQuote = {
  requiredFee: bigint;
  feeAsset: string;
  feeCollectorPrivateAddress: string;
  feeRate: string;
};

function presentInstructedAmount(amount: string | undefined): string | undefined {
  const trimmed = amount?.trim() ?? '';
  if (!trimmed || trimmed === '0') {
    return undefined;
  }
  return trimmed;
}

export function feeQuoteRequestBody(request: FeeQuoteRequest): FeeQuoteRequest {
  const publicDepositAmount = presentInstructedAmount(request.publicDepositAmount);
  const transferInstructedAmount = presentInstructedAmount(
    request.transferInstructedAmount,
  );
  const publicWithdrawalAmount = presentInstructedAmount(
    request.publicWithdrawalAmount,
  );
  return {
    feeAsset: request.feeAsset,
    spendsNotes: request.spendsNotes,
    ...(publicDepositAmount === undefined ? {} : { publicDepositAmount }),
    ...(transferInstructedAmount === undefined ? {} : { transferInstructedAmount }),
    ...(publicWithdrawalAmount === undefined ? {} : { publicWithdrawalAmount }),
  };
}
