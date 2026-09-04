import type { CoinData, DepositSlot } from '@auditable/privacy-pool-zk-sdk';
import { buildRecipientAndOptionalChangeDeposits } from './recipient-change-deposits.js';
import { withTokenAddressPublicInputs } from '../../proofs/transaction-input.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../../encoding/priv-key-scalar-from-recipient-hex.js';
import { recipientPublicKeysDecimalFromPrivateAddress } from '../../private-address/codec.js';
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

function publicEscrowRecipientLimbs(parameters: {
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
}): { escrowRecipientHi: string; escrowRecipientLo: string } | undefined {
  const limbs = parameters.escrowClaimantLimbs;
  if (!limbs) {
    return undefined;
  }
  return {
    escrowRecipientHi: limbs.recipientHi,
    escrowRecipientLo: limbs.recipientLo,
  };
}

export function sweepWithdrawStamp(parameters: {
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
}):
  | {
      escrowRecipientHi: string;
      escrowRecipientLo: string;
      escrowNonce?: string;
    }
  | undefined {
  const publicLimbs = publicEscrowRecipientLimbs(parameters);
  if (!publicLimbs) {
    return undefined;
  }
  return {
    ...publicLimbs,
    ...(parameters.escrowClaimantLimbs?.nonceDecimal
      ? { escrowNonce: parameters.escrowClaimantLimbs.nonceDecimal }
      : {}),
  };
}

export function stampWithdrawEscrowLimbs<
  T extends { recipientStellar: [string, string]; escrowNonce?: string },
>(
  withdrawObject: T,
  limbs?: {
    escrowRecipientHi: string;
    escrowRecipientLo: string;
    escrowNonce?: string;
  },
): T {
  if (!limbs) {
    return withdrawObject;
  }
  return {
    ...withdrawObject,
    recipientStellar: [limbs.escrowRecipientHi, limbs.escrowRecipientLo],
    ...(limbs.escrowNonce ? { escrowNonce: limbs.escrowNonce } : {}),
  };
}

function sweepOutputOwnerFields(parameters: {
  recipientPrivateAddressStpl1: string;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
}): { sweepOutputOwnerPubX: string; sweepOutputOwnerPubY: string } | undefined {
  if (!parameters.escrowClaimantLimbs) {
    return undefined;
  }
  const [sweepOutputOwnerPubX, sweepOutputOwnerPubY] =
    recipientPublicKeysDecimalFromPrivateAddress(
      parameters.recipientPrivateAddressStpl1,
    ) as [string, string];
  return { sweepOutputOwnerPubX, sweepOutputOwnerPubY };
}

async function buildTransferDepositsAndPublicInput(parameters: {
  recipientPrivateAddressStpl1: string;
  transferStroops: bigint;
  changeStroops: bigint;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
  stateRoot: string;
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
      ...(parameters.escrowClaimantLimbs
        ? { escrowClaimantLimbs: parameters.escrowClaimantLimbs }
        : {}),
    });
  const publicInput = withTokenAddressPublicInputs(
    {
      stateRoot: parameters.stateRoot,
      privKeyScalar: parameters.privKeyScalar,
      ...publicEscrowRecipientLimbs(parameters),
      ...sweepOutputOwnerFields(parameters),
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
  return buildTransferDepositsAndPublicInput({
    recipientPrivateAddressStpl1: parameters.recipientPrivateAddressStpl1,
    transferStroops: parameters.transferStroops,
    changeStroops: parameters.changeStroops,
    selfPrivateAddressStpl1ForChange: parameters.selfPrivateAddressStpl1ForChange,
    tokenAddress: parameters.tokenAddress,
    stateRoot: parameters.stateRoot,
    privKeyScalar: privKeyScalarDecimalFromRecipientScalarHex(
      parameters.senderPrivKeyScalarHex,
    ),
    ...(parameters.escrowSend ? { escrowSend: parameters.escrowSend } : {}),
    ...(parameters.escrowClaimantLimbs
      ? { escrowClaimantLimbs: parameters.escrowClaimantLimbs }
      : {}),
  });
}
