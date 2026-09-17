import type { CoinData, DepositSlot } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { ZERO_STROOPS } from '../proofs/confidential/helpers.js';
import type { AlignedDepositSlot } from '../pool/proof-types.js';

export type FeeOutputSpec = {
  requiredFee: bigint;
  feeCollectorPrivateAddress: string;
};

export type FeeOutputCoin = {
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
};

export type AlignedFeeSlotBuilder = (parameters: {
  privateAddressStpl1: string;
  amountStroops: bigint;
  tokenAddress: string;
}) => Promise<AlignedDepositSlot>;

function feeCoinFromSlot(slot: AlignedDepositSlot): FeeOutputCoin {
  return {
    commitment_hex: slot.commitment_hex,
    coin: slot.coin,
    depositScalarHex: slot.depositScalarHex,
    precommitementHex: slot.precommitementHex,
  };
}

export async function appendFeeOutputSlot(input: {
  deposits: DepositSlot[];
  tokenAddress: string;
  buildAlignedDepositSlot: AlignedFeeSlotBuilder;
  feeOutput?: FeeOutputSpec;
}): Promise<{ deposits: DepositSlot[]; feeCoin?: FeeOutputCoin }> {
  const requiredFee = input.feeOutput?.requiredFee ?? ZERO_STROOPS;
  const collector = input.feeOutput?.feeCollectorPrivateAddress.trim() ?? '';
  if (requiredFee <= ZERO_STROOPS || !collector) {
    return { deposits: input.deposits };
  }
  const slot = await input.buildAlignedDepositSlot({
    privateAddressStpl1: collector,
    amountStroops: requiredFee,
    tokenAddress: input.tokenAddress,
  });
  return {
    deposits: [...input.deposits, slot.deposit],
    feeCoin: feeCoinFromSlot(slot),
  };
}
