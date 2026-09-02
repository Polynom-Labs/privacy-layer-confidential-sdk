import { withdrawObjectFromMerkleWitness } from '@auditable/privacy-pool-zk-sdk';
import type {
  CoinData,
  PrivacyPoolSDK,
  StateFile,
} from '@auditable/privacy-pool-zk-sdk';
import { buildPublicWithdrawLegs } from '../../proofs/transaction-input.js';
import { MIN_CONFIDENTIAL_TRANSFER_STROOPS } from '../../proofs/confidential/helpers.js';
import { buildPoolTransactionAuditParameters } from '../../audit/parameters.js';
import {
  buildWithdrawPublicInput,
  prepareDualWithdrawProofInputs,
  resolveWithdrawChangeDeposits,
  type AlignedDepositSlotBuilder,
  type DualWithdrawProofParameters,
  type WithdrawChangeCoin,
} from '../../proofs/withdraw/helpers.js';
import type { KytApplicationIdHints } from '../../pool/proof-types.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../../encoding/priv-key-scalar-from-recipient-hex.js';

function validateSingleWithdrawAmounts(
  withdrawAmountStroops: bigint,
  noteStroops: bigint,
): bigint {
  if (withdrawAmountStroops < MIN_CONFIDENTIAL_TRANSFER_STROOPS) {
    throw new Error('Withdraw amount must be positive');
  }
  if (withdrawAmountStroops > noteStroops) {
    throw new Error('Withdraw amount exceeds note value');
  }
  return noteStroops - withdrawAmountStroops;
}

async function proveSingleWithdrawTransaction(parameters: {
  sdk: PrivacyPoolSDK;
  publicInput: ReturnType<typeof buildWithdrawPublicInput>;
  audit: ReturnType<typeof buildPoolTransactionAuditParameters>;
  primaryWithdraw: ReturnType<typeof withdrawObjectFromMerkleWitness>;
  deposits: Awaited<ReturnType<typeof resolveWithdrawChangeDeposits>>['deposits'];
  tokenAddress: string;
  withdrawAmountStroops: bigint;
}) {
  return parameters.sdk.proveTransaction(
    parameters.publicInput as unknown as Parameters<
      typeof parameters.sdk.proveTransaction
    >[0],
    buildPublicWithdrawLegs(
      parameters.tokenAddress,
      parameters.withdrawAmountStroops.toString(),
    ),
    [parameters.primaryWithdraw, 'dummy'],
    parameters.deposits,
    parameters.audit,
  );
}

function buildPrimaryWithdrawForCoin(parameters: {
  sdk: PrivacyPoolSDK;
  applicationId: string;
  coin: CoinData;
  state: StateFile;
  privKeyScalarHex: string;
}) {
  const witness = parameters.sdk.buildWithdrawMerkleWitness(
    parameters.coin,
    parameters.state,
  );
  const privKeyScalar = privKeyScalarDecimalFromRecipientScalarHex(
    parameters.privKeyScalarHex,
  );
  const ownerPubHex = parameters.sdk.ecdhEphemeralPublicKeyFromScalarHex(
    parameters.privKeyScalarHex,
  );
  const primaryWithdraw = withdrawObjectFromMerkleWitness(
    witness,
    ownerPubHex,
    parameters.applicationId,
    privKeyScalar,
  );
  return { witness, primaryWithdraw };
}

async function prepareSingleWithdrawProofInputs(parameters: {
  sdk: PrivacyPoolSDK;
  applicationId: string;
  buildAlignedDepositSlot: AlignedDepositSlotBuilder;
  coin: CoinData;
  state: StateFile;
  destinationStellarAddress: string;
  privKeyScalarHex: string;
  depositorEphemeralKey: string;
  withdrawAmountStroops: bigint;
  changePrivateAddressStpl1: string | undefined;
  tokenAddress: string;
  auditPublicKey?: [string, string];
}) {
  const noteStroops = BigInt(parameters.coin.value);
  const changeStroops = validateSingleWithdrawAmounts(
    parameters.withdrawAmountStroops,
    noteStroops,
  );
  const { witness, primaryWithdraw } = buildPrimaryWithdrawForCoin({
    sdk: parameters.sdk,
    applicationId: parameters.applicationId,
    coin: parameters.coin,
    state: parameters.state,
    privKeyScalarHex: parameters.privKeyScalarHex,
  });
  const { deposits, changeCoin } = await resolveWithdrawChangeDeposits({
    changeStroops,
    changePrivateAddressStpl1: parameters.changePrivateAddressStpl1,
    buildAlignedDepositSlot: parameters.buildAlignedDepositSlot,
    tokenAddress: parameters.tokenAddress,
  });
  const publicInput = buildWithdrawPublicInput({
    stateRoot: witness.stateRoot,
    destinationStellarAddress: parameters.destinationStellarAddress,
    privKeyScalarHex: parameters.privKeyScalarHex,
    tokenAddress: parameters.tokenAddress,
  });
  const audit = buildPoolTransactionAuditParameters({
    applicationId: parameters.applicationId,
    ...(parameters.auditPublicKey ? { auditPublicKey: parameters.auditPublicKey } : {}),
  });
  return {
    primaryWithdraw,
    deposits,
    changeCoin,
    publicInput,
    audit,
  };
}

export async function proveWithdrawTransact(parameters: {
  sdk: PrivacyPoolSDK;
  applicationId: string;
  buildAlignedDepositSlot: AlignedDepositSlotBuilder;
  coin: CoinData;
  state: StateFile;
  destinationStellarAddress: string;
  privKeyScalarHex: string;
  depositorEphemeralKey: string;
  withdrawAmountStroops: bigint;
  changePrivateAddressStpl1: string | undefined;
  tokenAddress: string;
  auditPublicKey?: [string, string];
}): Promise<{
  proof_hex: string;
  public_hex: string;
  applicationIdsPlaintext: KytApplicationIdHints;
  changeCoin?: WithdrawChangeCoin;
}> {
  const { primaryWithdraw, deposits, changeCoin, publicInput, audit } =
    await prepareSingleWithdrawProofInputs(parameters);
  const proof = await proveSingleWithdrawTransaction({
    sdk: parameters.sdk,
    publicInput,
    audit,
    primaryWithdraw,
    deposits,
    tokenAddress: parameters.tokenAddress,
    withdrawAmountStroops: parameters.withdrawAmountStroops,
  });
  return {
    ...proof,
    applicationIdsPlaintext: [
      parameters.applicationId,
      '0',
      changeCoin ? parameters.applicationId : '0',
      '0',
    ],
    ...(changeCoin ? { changeCoin } : {}),
  };
}

export async function proveWithdrawTransactDual(
  parameters: DualWithdrawProofParameters & { applicationId: string },
): Promise<{
  proof_hex: string;
  public_hex: string;
  applicationIdsPlaintext: KytApplicationIdHints;
  changeCoin?: WithdrawChangeCoin;
}> {
  const { publicInput, audit, withdrawLegs, deposits, changeCoin } =
    await prepareDualWithdrawProofInputs(parameters);
  const proof = await parameters.sdk.proveTransaction(
    publicInput as unknown as Parameters<typeof parameters.sdk.proveTransaction>[0],
    buildPublicWithdrawLegs(
      parameters.tokenAddress,
      parameters.withdrawAmountStroops.toString(),
    ),
    withdrawLegs,
    deposits,
    audit,
  );
  return {
    ...proof,
    applicationIdsPlaintext: [
      audit.applicationId,
      audit.applicationId,
      changeCoin ? audit.applicationId : '0',
      '0',
    ],
    ...(changeCoin ? { changeCoin } : {}),
  };
}

export { type AlignedDepositSlotBuilder } from '../../proofs/withdraw/helpers.js';
