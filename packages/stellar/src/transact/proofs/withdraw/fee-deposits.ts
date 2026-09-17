import type { DepositSlot } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import {
  appendFeeOutputSlot,
  type FeeOutputCoin,
  type FeeOutputSpec,
} from '../../fees/append-fee-output.js';
import {
  resolveWithdrawChangeDeposits,
  type AlignedDepositSlotBuilder,
  type WithdrawChangeCoin,
} from './helpers.js';

export async function withdrawDepositsWithFee(parameters: {
  changeStroops: bigint;
  changePrivateAddressStpl1: string | undefined;
  buildAlignedDepositSlot: AlignedDepositSlotBuilder;
  tokenAddress: string;
  feeOutput?: FeeOutputSpec;
}): Promise<{
  deposits: DepositSlot[];
  changeCoin?: WithdrawChangeCoin;
  feeCoin?: FeeOutputCoin;
}> {
  const { deposits, changeCoin } = await resolveWithdrawChangeDeposits({
    changeStroops: parameters.changeStroops,
    changePrivateAddressStpl1: parameters.changePrivateAddressStpl1,
    buildAlignedDepositSlot: parameters.buildAlignedDepositSlot,
    tokenAddress: parameters.tokenAddress,
  });
  const withFee = await appendFeeOutputSlot({
    deposits,
    tokenAddress: parameters.tokenAddress,
    buildAlignedDepositSlot: parameters.buildAlignedDepositSlot,
    ...(parameters.feeOutput ? { feeOutput: parameters.feeOutput } : {}),
  });
  return {
    deposits: withFee.deposits,
    ...(changeCoin ? { changeCoin } : {}),
    ...(withFee.feeCoin ? { feeCoin: withFee.feeCoin } : {}),
  };
}

export function withdrawOutputApplicationIds(input: {
  applicationId: string;
  hasChange: boolean;
  hasFeeOutput: boolean;
}): string[] {
  const outputIds: string[] = [];
  if (input.hasChange) {
    outputIds.push(input.applicationId);
  }
  if (input.hasFeeOutput) {
    outputIds.push(input.applicationId);
  }
  if (outputIds.length === 0) {
    outputIds.push('0');
  }
  return outputIds;
}
