import {
  randomFrDecimal253,
  scalarHexToFrDecimal,
  type CoinData,
  type PrivacyPoolSDK,
} from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { merkleRootBufferToFrDecimal } from '../merkle/field-decimal.js';
import { recipientPublicKeysDecimalFromPrivateAddress } from '../private-address/codec.js';
import {
  buildPublicDepositLegs,
  withTokenAddressPublicInputs,
} from '../proofs/transaction-input.js';
import { buildPoolTransactionAuditParameters } from '../audit/parameters.js';
import {
  buildApplicationIdHints,
  padDepositSlotsToLayout,
  padPublicLegsToLayout,
  padWithdrawSlotsToLayout,
} from '../zk/slots.js';
import type { ProofResult } from './proof-types.js';
import { appendFeeOutputSlot, type FeeOutputSpec } from '../fees/append-fee-output.js';
import type { AlignedDepositSlot } from './proof-types.js';

export type PrepareDepositTransactProofInput = {
  sdk: PrivacyPoolSDK;
  applicationId: string;
  auditPublicKey?: [string, string];
  privateAddressStpl1: string;
  coin: CoinData;
  depositScalarHex: string;
  merkleRootBytes: Buffer;
  tokenAddress: string;
  publicDepositStroops?: bigint;
  feeOutput?: FeeOutputSpec;
  buildAlignedDepositSlot: (parameters: {
    privateAddressStpl1: string;
    amountStroops: bigint;
    tokenAddress: string;
  }) => Promise<AlignedDepositSlot>;
};

function userDepositSlot(input: PrepareDepositTransactProofInput) {
  return {
    value: input.coin.value,
    nullifier: input.coin.nullifier,
    ephemeralKeyScalar: scalarHexToFrDecimal(input.depositScalarHex),
    asset: [input.coin.asset_hi, input.coin.asset_lo] as [string, string],
    applicationId: input.applicationId,
    recipientPublicKeys: recipientPublicKeysDecimalFromPrivateAddress(
      input.privateAddressStpl1,
    ) as [string, string],
  };
}

function outputApplicationIds(input: {
  applicationId: string;
  hasFeeOutput: boolean;
}): string[] {
  if (input.hasFeeOutput) {
    return [input.applicationId, input.applicationId];
  }
  return [input.applicationId];
}

export async function proveDepositTransact(
  input: PrepareDepositTransactProofInput,
): Promise<ProofResult> {
  const publicDeposit = (
    input.publicDepositStroops ?? BigInt(input.coin.value)
  ).toString();
  const withFee = await appendFeeOutputSlot({
    deposits: [userDepositSlot(input)],
    tokenAddress: input.tokenAddress,
    buildAlignedDepositSlot: input.buildAlignedDepositSlot,
    ...(input.feeOutput ? { feeOutput: input.feeOutput } : {}),
  });
  const audit = buildPoolTransactionAuditParameters({
    applicationId: input.applicationId,
    nAuditSlots: input.sdk.getLayout().nAuditSlots,
    ...(input.auditPublicKey ? { auditPublicKey: input.auditPublicKey } : {}),
  });
  const proof = await input.sdk.proveTransaction(
    withTokenAddressPublicInputs(
      {
        stateRoot: merkleRootBufferToFrDecimal(input.merkleRootBytes),
        privKeyScalar: randomFrDecimal253(),
      },
      input.tokenAddress,
    ) as unknown as Parameters<typeof input.sdk.proveTransaction>[0],
    padPublicLegsToLayout(
      input.sdk,
      buildPublicDepositLegs(input.tokenAddress, publicDeposit),
    ),
    padWithdrawSlotsToLayout(input.sdk, []),
    padDepositSlotsToLayout(input.sdk, withFee.deposits),
    audit,
  );
  return {
    ...proof,
    applicationIdsPlaintext: buildApplicationIdHints({
      sdk: input.sdk,
      inputIds: [],
      outputIds: outputApplicationIds({
        applicationId: input.applicationId,
        hasFeeOutput: Boolean(withFee.feeCoin),
      }),
    }),
  };
}
