import type { CoinData, DepositSlot } from '@auditable/privacy-pool-zk-sdk';
import { buildRecipientAndOptionalChangeDeposits } from './recipient-change-deposits.js';
import { withTokenAddressPublicInputs } from '../../proofs/transaction-input.js';
import { senderWithdrawFrAndScalar } from '../../proofs/confidential/helpers.js';
import type {
  TransferEscrowClaimantLimbs,
  TransferEscrowSend,
} from '../../environment/types.js';

export type GeneratedOutputCoin = {
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
};

export function generatedOutputCoinFromSlot(
  slot: GeneratedOutputCoin,
): GeneratedOutputCoin {
  return {
    commitment_hex: slot.commitment_hex,
    coin: slot.coin,
    depositScalarHex: slot.depositScalarHex,
    precommitementHex: slot.precommitementHex,
  };
}

export function publicEscrowRecipientLimbs(parameters: {
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
}): { escrowRecipientHi: string; escrowRecipientLo: string } | undefined {
  const limbs = parameters.escrowClaimantLimbs ?? parameters.escrowSend;
  if (!limbs) {
    return undefined;
  }
  return {
    escrowRecipientHi: limbs.recipientHi,
    escrowRecipientLo: limbs.recipientLo,
  };
}

export function stampWithdrawEscrowLimbs<
  T extends { recipientStellar: [string, string] },
>(
  withdrawObject: T,
  limbs?: { escrowRecipientHi: string; escrowRecipientLo: string },
): T {
  if (!limbs) {
    return withdrawObject;
  }
  return {
    ...withdrawObject,
    recipientStellar: [limbs.escrowRecipientHi, limbs.escrowRecipientLo],
  };
}

async function buildTransferDepositsAndPublicInput(parameters: {
  recipientPrivateAddressStpl1: string;
  transferStroops: bigint;
  changeStroops: bigint;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
  stateRoot: string;
  withdrawAddressHi: string;
  withdrawAddressLo: string;
  privKeyScalar: string;
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
}): Promise<{
  recipientSlot: GeneratedOutputCoin;
  deposits: [DepositSlot, DepositSlot];
  changeCoin?: GeneratedOutputCoin;
  publicInput: ReturnType<typeof withTokenAddressPublicInputs>;
}> {
  const { recipientSlot, deposits, changeCoin } =
    await buildRecipientAndOptionalChangeDeposits({
      recipientPrivateAddressStpl1: parameters.recipientPrivateAddressStpl1,
      transferStroops: parameters.transferStroops,
      changeStroops: parameters.changeStroops,
      selfPrivateAddressStpl1ForChange: parameters.selfPrivateAddressStpl1ForChange,
      tokenAddress: parameters.tokenAddress,
      ...(parameters.escrowSend ? { escrowSend: parameters.escrowSend } : {}),
    });
  const publicEscrow = publicEscrowRecipientLimbs(parameters);
  const publicInput = withTokenAddressPublicInputs(
    {
      stateRoot: parameters.stateRoot,
      withdrawAddressHi: parameters.withdrawAddressHi,
      withdrawAddressLo: parameters.withdrawAddressLo,
      privKeyScalar: parameters.privKeyScalar,
      ...publicEscrow,
    },
    parameters.tokenAddress,
  );
  return {
    recipientSlot,
    deposits,
    ...(changeCoin ? { changeCoin } : {}),
    publicInput,
  };
}

export async function buildSenderTransferDepositsAndPublicInput(parameters: {
  senderGAddress: string;
  senderPrivKeyScalarHex: string;
  recipientPrivateAddressStpl1: string;
  transferStroops: bigint;
  changeStroops: bigint;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
  stateRoot: string;
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
}): ReturnType<typeof buildTransferDepositsAndPublicInput> {
  const { hi, lo, privKeyScalar } = senderWithdrawFrAndScalar({
    senderGAddress: parameters.senderGAddress,
    senderPrivKeyScalarHex: parameters.senderPrivKeyScalarHex,
  });
  return buildTransferDepositsAndPublicInput({
    recipientPrivateAddressStpl1: parameters.recipientPrivateAddressStpl1,
    transferStroops: parameters.transferStroops,
    changeStroops: parameters.changeStroops,
    selfPrivateAddressStpl1ForChange: parameters.selfPrivateAddressStpl1ForChange,
    tokenAddress: parameters.tokenAddress,
    stateRoot: parameters.stateRoot,
    withdrawAddressHi: hi,
    withdrawAddressLo: lo,
    privKeyScalar,
    ...(parameters.escrowSend ? { escrowSend: parameters.escrowSend } : {}),
    ...(parameters.escrowClaimantLimbs
      ? { escrowClaimantLimbs: parameters.escrowClaimantLimbs }
      : {}),
  });
}
