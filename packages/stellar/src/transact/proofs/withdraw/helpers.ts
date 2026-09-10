import { ed25519PubkeyPayloadHexToWithdrawFrDecimals } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import type {
  CoinData,
  DepositObject,
  DepositSlot,
  PrivacyPoolSDK,
  StateFile,
  WithdrawObject,
} from '@arcanetech/stellar-privacy-pool-zk-sdk';
import {
  dualWithdrawLegsWithSharedRoot,
  MIN_CONFIDENTIAL_TRANSFER_STROOPS,
  requireChangeRecipientWhenPartial,
  ZERO_STROOPS,
} from '../../proofs/confidential/helpers.js';
import { ed25519PublicKeyHexFromStellarAccount } from '../../stellar/account.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../../encoding/priv-key-scalar-from-recipient-hex.js';
import {
  publicWithdrawAddressLimbs,
  withTokenAddressPublicInputs,
} from '../../proofs/transaction-input.js';
import { buildPoolTransactionAuditParameters } from '../../audit/parameters.js';
import type { TransactionAuditParams } from '@arcanetech/stellar-privacy-pool-zk-sdk';

export type AlignedDepositSlotBuilder = (parameters: {
  privateAddressStpl1: string;
  amountStroops: bigint;
  tokenAddress: string;
}) => Promise<{
  deposit: DepositObject;
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
}>;

export type WithdrawChangeCoin = {
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
};

export type DualWithdrawProofParameters = {
  sdk: PrivacyPoolSDK;
  buildAlignedDepositSlot: AlignedDepositSlotBuilder;
  coinA: CoinData;
  coinB: CoinData;
  state: StateFile;
  destinationStellarAddress: string;
  privKeyScalarHex: string;
  ephemeralAKey: string;
  ephemeralBKey: string;
  withdrawAmountStroops: bigint;
  changePrivateAddressStpl1: string | undefined;
  tokenAddress: string;
  auditPublicKey?: [string, string];
};

function destinationWithdrawFrAndScalar(parameters: {
  destinationStellarAddress: string;
  privKeyScalarHex: string;
}): {
  hi: string;
  lo: string;
  privKeyScalar: string;
} {
  const pkHex = ed25519PublicKeyHexFromStellarAccount(
    parameters.destinationStellarAddress,
  );
  const { hi, lo } = ed25519PubkeyPayloadHexToWithdrawFrDecimals(pkHex);
  const privKeyScalar = privKeyScalarDecimalFromRecipientScalarHex(
    parameters.privKeyScalarHex,
  );
  return { hi, lo, privKeyScalar };
}

export function buildWithdrawPublicInput(parameters: {
  stateRoot: string;
  destinationStellarAddress: string;
  privKeyScalarHex: string;
  tokenAddress: string;
  publicWithdrawalAmount: string;
}): ReturnType<typeof withTokenAddressPublicInputs> {
  const { hi, lo, privKeyScalar } = destinationWithdrawFrAndScalar({
    destinationStellarAddress: parameters.destinationStellarAddress,
    privKeyScalarHex: parameters.privKeyScalarHex,
  });
  return withTokenAddressPublicInputs(
    {
      stateRoot: parameters.stateRoot,
      ...publicWithdrawAddressLimbs({
        publicWithdrawalAmount: parameters.publicWithdrawalAmount,
        destinationHi: hi,
        destinationLo: lo,
      }),
      privKeyScalar,
    },
    parameters.tokenAddress,
  );
}

export async function resolveWithdrawChangeDeposits(parameters: {
  changeStroops: bigint;
  changePrivateAddressStpl1: string | undefined;
  buildAlignedDepositSlot: AlignedDepositSlotBuilder;
  tokenAddress: string;
}): Promise<{
  deposits: DepositSlot[];
  changeCoin?: WithdrawChangeCoin;
}> {
  if (parameters.changeStroops <= ZERO_STROOPS) {
    return { deposits: [] };
  }
  const stpl1 = parameters.changePrivateAddressStpl1?.trim() ?? '';
  if (!stpl1) {
    throw new Error(
      'Private address is required to return the unused balance to the pool (partial withdraw)',
    );
  }
  const slot = await parameters.buildAlignedDepositSlot({
    privateAddressStpl1: stpl1,
    amountStroops: parameters.changeStroops,
    tokenAddress: parameters.tokenAddress,
  });
  return {
    deposits: [slot.deposit],
    changeCoin: {
      commitment_hex: slot.commitment_hex,
      coin: slot.coin,
      depositScalarHex: slot.depositScalarHex,
      precommitementHex: slot.precommitementHex,
    },
  };
}

function validateDualWithdrawAmounts(
  withdrawAmountStroops: bigint,
  totalNotes: bigint,
  changePrivateAddressStpl1: string | undefined,
): bigint {
  if (withdrawAmountStroops < MIN_CONFIDENTIAL_TRANSFER_STROOPS) {
    throw new Error('Withdraw amount must be positive');
  }
  if (withdrawAmountStroops > totalNotes) {
    throw new Error('Withdraw amount exceeds combined note value');
  }
  const changeStroops = totalNotes - withdrawAmountStroops;
  requireChangeRecipientWhenPartial(changeStroops, changePrivateAddressStpl1);
  return changeStroops;
}

function buildDualWithdrawPublicInput(parameters: {
  destinationStellarAddress: string;
  privKeyScalarHex: string;
  tokenAddress: string;
  stateRoot: string;
  publicWithdrawalAmount: string;
}): ReturnType<typeof withTokenAddressPublicInputs> {
  return buildWithdrawPublicInput({
    stateRoot: parameters.stateRoot,
    destinationStellarAddress: parameters.destinationStellarAddress,
    privKeyScalarHex: parameters.privKeyScalarHex,
    tokenAddress: parameters.tokenAddress,
    publicWithdrawalAmount: parameters.publicWithdrawalAmount,
  });
}

type DualWithdrawProofInputs = {
  publicInput: ReturnType<typeof withTokenAddressPublicInputs>;
  audit: TransactionAuditParams;
  withdrawLegs: [WithdrawObject, WithdrawObject];
  deposits: DepositSlot[];
  changeCoin?: WithdrawChangeCoin;
};

export async function prepareDualWithdrawProofInputs(
  parameters: DualWithdrawProofParameters & { applicationId: string },
): Promise<DualWithdrawProofInputs> {
  const changeStroops = validateDualWithdrawAmounts(
    parameters.withdrawAmountStroops,
    BigInt(parameters.coinA.value) + BigInt(parameters.coinB.value),
    parameters.changePrivateAddressStpl1,
  );
  const { legA, legB } = dualWithdrawLegsWithSharedRoot({
    sdk: parameters.sdk,
    coinA: parameters.coinA,
    coinB: parameters.coinB,
    state: parameters.state,
    ownerPubHex: parameters.sdk.ecdhEphemeralPublicKeyFromScalarHex(
      parameters.privKeyScalarHex,
    ),
    privKeyScalar: privKeyScalarDecimalFromRecipientScalarHex(
      parameters.privKeyScalarHex,
    ),
    applicationId: parameters.applicationId,
  });
  const { deposits, changeCoin } = await resolveWithdrawChangeDeposits({
    changeStroops,
    changePrivateAddressStpl1: parameters.changePrivateAddressStpl1,
    buildAlignedDepositSlot: parameters.buildAlignedDepositSlot,
    tokenAddress: parameters.tokenAddress,
  });
  const publicInput = buildDualWithdrawPublicInput({
    destinationStellarAddress: parameters.destinationStellarAddress,
    privKeyScalarHex: parameters.privKeyScalarHex,
    tokenAddress: parameters.tokenAddress,
    stateRoot: legA.witness.stateRoot,
    publicWithdrawalAmount: parameters.withdrawAmountStroops.toString(),
  });
  const audit = buildPoolTransactionAuditParameters({
    applicationId: parameters.applicationId,
    nAuditSlots: parameters.sdk.getLayout().nAuditSlots,
    ...(parameters.auditPublicKey ? { auditPublicKey: parameters.auditPublicKey } : {}),
  });
  return {
    publicInput,
    audit,
    deposits,
    withdrawLegs: [legA.withdrawObject, legB.withdrawObject],
    ...(changeCoin ? { changeCoin } : {}),
  };
}
