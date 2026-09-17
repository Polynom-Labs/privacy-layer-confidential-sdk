import type { CoinData, DepositSlot } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { getPrivacyPoolService } from '../../pool/singleton.js';
import { ZERO_STROOPS } from './helpers.js';
import type { AlignedDepositSlot } from '../../pool/proof-types.js';
import type {
  TransferEscrowClaimantLimbs,
  TransferEscrowSend,
} from '../../environment/types.js';
import {
  appendFeeOutputSlot,
  type FeeOutputCoin,
  type FeeOutputSpec,
} from '../../fees/append-fee-output.js';

type ChangeCoin = {
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
};

type EscrowSlotInput = {
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
};

function escrowOutputFields(input: EscrowSlotInput) {
  if (!input.escrowSend) {
    return {};
  }
  return {
    escrowNonce: input.escrowSend.nonceDecimal,
    recipientHi: input.escrowSend.recipientHi,
    recipientLo: input.escrowSend.recipientLo,
  };
}

async function buildChangeDepositPair(parameters: {
  selfPrivateAddressStpl1ForChange: string;
  changeStroops: bigint;
  tokenAddress: string;
  recipientDeposit: DepositSlot;
}): Promise<{ deposits: DepositSlot[]; changeCoin: ChangeCoin }> {
  const changeSlot = await getPrivacyPoolService().buildAlignedDepositSlot({
    privateAddressStpl1: parameters.selfPrivateAddressStpl1ForChange.trim(),
    amountStroops: parameters.changeStroops,
    tokenAddress: parameters.tokenAddress,
  });
  return {
    deposits: [parameters.recipientDeposit, changeSlot.deposit],
    changeCoin: {
      commitment_hex: changeSlot.commitment_hex,
      coin: changeSlot.coin,
      depositScalarHex: changeSlot.depositScalarHex,
      precommitementHex: changeSlot.precommitementHex,
    },
  };
}

function recipientOnlyDeposits(
  recipientDeposit: DepositSlot,
  hasFeeOutput: boolean,
): DepositSlot[] {
  if (hasFeeOutput) {
    return [recipientDeposit];
  }
  return [recipientDeposit, 'dummy'];
}

async function depositsWithoutFee(input: {
  recipientDeposit: DepositSlot;
  changeStroops: bigint;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
  hasFeeOutput: boolean;
}): Promise<{ deposits: DepositSlot[]; changeCoin?: ChangeCoin }> {
  if (input.changeStroops <= ZERO_STROOPS) {
    return {
      deposits: recipientOnlyDeposits(input.recipientDeposit, input.hasFeeOutput),
    };
  }
  return buildChangeDepositPair({
    selfPrivateAddressStpl1ForChange: input.selfPrivateAddressStpl1ForChange!,
    changeStroops: input.changeStroops,
    tokenAddress: input.tokenAddress,
    recipientDeposit: input.recipientDeposit,
  });
}

export async function buildRecipientAndOptionalChangeDeposits(parameters: {
  recipientPrivateAddressStpl1: string;
  transferStroops: bigint;
  changeStroops: bigint;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
  feeOutput?: FeeOutputSpec;
}): Promise<{
  recipientSlot: AlignedDepositSlot;
  deposits: DepositSlot[];
  changeCoin?: ChangeCoin;
  feeCoin?: FeeOutputCoin;
}> {
  const escrow: EscrowSlotInput = {
    ...(parameters.escrowSend ? { escrowSend: parameters.escrowSend } : {}),
    ...(parameters.escrowClaimantLimbs
      ? { escrowClaimantLimbs: parameters.escrowClaimantLimbs }
      : {}),
  };
  const recipientSlot = await getPrivacyPoolService().buildAlignedDepositSlot({
    privateAddressStpl1: parameters.recipientPrivateAddressStpl1.trim(),
    amountStroops: parameters.transferStroops,
    tokenAddress: parameters.tokenAddress,
    ...escrowOutputFields(escrow),
  });
  const withoutFee = await depositsWithoutFee({
    recipientDeposit: recipientSlot.deposit,
    changeStroops: parameters.changeStroops,
    selfPrivateAddressStpl1ForChange: parameters.selfPrivateAddressStpl1ForChange,
    tokenAddress: parameters.tokenAddress,
    hasFeeOutput: (parameters.feeOutput?.requiredFee ?? ZERO_STROOPS) > ZERO_STROOPS,
  });
  const withFee = await appendFeeOutputSlot({
    deposits: withoutFee.deposits,
    tokenAddress: parameters.tokenAddress,
    buildAlignedDepositSlot: (aligned) =>
      getPrivacyPoolService().buildAlignedDepositSlot(aligned),
    ...(parameters.feeOutput ? { feeOutput: parameters.feeOutput } : {}),
  });
  return {
    recipientSlot,
    deposits: withFee.deposits,
    ...('changeCoin' in withoutFee ? { changeCoin: withoutFee.changeCoin } : {}),
    ...(withFee.feeCoin ? { feeCoin: withFee.feeCoin } : {}),
  };
}
