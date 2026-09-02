import type { CoinData, DepositSlot } from '@auditable/privacy-pool-zk-sdk';
import { buildRecipientAndOptionalChangeDeposits } from './recipient-change-deposits.js';
import { withTokenAddressPublicInputs } from '../../proofs/transaction-input.js';
import { senderWithdrawFrAndScalar } from '../../proofs/confidential/helpers.js';

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
    });
  const publicInput = withTokenAddressPublicInputs(
    {
      stateRoot: parameters.stateRoot,
      withdrawAddressHi: parameters.withdrawAddressHi,
      withdrawAddressLo: parameters.withdrawAddressLo,
      privKeyScalar: parameters.privKeyScalar,
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
  });
}
