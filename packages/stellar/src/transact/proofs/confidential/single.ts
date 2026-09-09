import type { CoinData, StateFile } from '@auditable/privacy-pool-zk-sdk';
import { getPrivacyPoolService } from '../../pool/singleton.js';
import { buildZeroPublicLegs } from '../../proofs/transaction-input.js';
import {
  buildApplicationIdHints,
  padDepositSlotsToLayout,
  padPublicLegsToLayout,
  padWithdrawSlotsToLayout,
} from '../../zk/slots.js';
import {
  MIN_CONFIDENTIAL_TRANSFER_STROOPS,
  requireChangeRecipientWhenPartial,
  withdrawWitnessForCoin,
} from '../../proofs/confidential/helpers.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../../encoding/priv-key-scalar-from-recipient-hex.js';
import { buildPoolTransactionAuditParameters } from '../../audit/parameters.js';
import type { KytApplicationIdHints } from '../../pool/proof-types.js';
import {
  buildSenderTransferDepositsAndPublicInput,
  generatedOutputCoinFromSlot,
  stampWithdrawEscrowLimbs,
  sweepWithdrawStamp,
  type GeneratedOutputCoin,
} from './shared.js';
import type {
  TransferEscrowClaimantLimbs,
  TransferEscrowSend,
} from '../../environment/types.js';
type PrepareConfidentialTransferProofParameters = {
  coin: CoinData;
  state: StateFile;
  senderPrivKeyScalarHex: string;
  depositorEphemeralKey: string;
  transferStroops: bigint;
  recipientPrivateAddressStpl1: string;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
  escrowSend?: TransferEscrowSend;
  escrowClaimantLimbs?: TransferEscrowClaimantLimbs;
};

type PrepareConfidentialTransferProofResult = {
  proof_hex: string;
  public_hex: string;
  ciphertext_hex?: string;
  output_note_ephemeral_scalars?: string[];
  applicationIdsPlaintext: KytApplicationIdHints;
  recipientCoin: GeneratedOutputCoin;
  changeCoin?: GeneratedOutputCoin;
};
type SenderTransferBuild = Awaited<
  ReturnType<typeof buildSenderTransferDepositsAndPublicInput>
>;
type InitializedPrivacySdk = Awaited<
  ReturnType<ReturnType<typeof getPrivacyPoolService>['getInitializedSdk']>
>;

function validateSingleCoinTransferAmounts(
  transferStroops: bigint,
  noteStroops: bigint,
  selfPrivateAddressStpl1ForChange: string | undefined,
): bigint {
  if (transferStroops < MIN_CONFIDENTIAL_TRANSFER_STROOPS) {
    throw new Error('Transfer amount must be positive');
  }
  if (transferStroops > noteStroops) {
    throw new Error('Transfer amount exceeds note value');
  }
  const changeStroops = noteStroops - transferStroops;
  requireChangeRecipientWhenPartial(changeStroops, selfPrivateAddressStpl1ForChange);
  return changeStroops;
}

function buildSingleTransferApplicationIds(
  sdk: InitializedPrivacySdk,
  applicationId: string,
  changeCoin?: GeneratedOutputCoin,
): KytApplicationIdHints {
  return buildApplicationIdHints({
    sdk,
    inputIds: [applicationId],
    outputIds: [applicationId, changeCoin ? applicationId : '0'],
  });
}

function buildTransferAuditParameters(parameters: {
  poolService: ReturnType<typeof getPrivacyPoolService>;
  applicationId: string;
  nAuditSlots: number;
}) {
  const auditPublicKey = parameters.poolService.getAuditPublicKey();
  return buildPoolTransactionAuditParameters({
    applicationId: parameters.applicationId,
    nAuditSlots: parameters.nAuditSlots,
    ...(auditPublicKey ? { auditPublicKey } : {}),
  });
}

async function proveTransaction(parameters: {
  sdk: InitializedPrivacySdk;
  publicInput: SenderTransferBuild['publicInput'];
  withdrawObject: ReturnType<typeof withdrawWitnessForCoin>['withdrawObject'];
  deposits: SenderTransferBuild['deposits'];
  audit: ReturnType<typeof buildTransferAuditParameters>;
}) {
  return parameters.sdk.proveTransaction(
    parameters.publicInput as unknown as Parameters<
      typeof parameters.sdk.proveTransaction
    >[0],
    padPublicLegsToLayout(parameters.sdk, buildZeroPublicLegs()),
    padWithdrawSlotsToLayout(parameters.sdk, [parameters.withdrawObject]),
    padDepositSlotsToLayout(parameters.sdk, parameters.deposits),
    parameters.audit,
  );
}

type TransferProofInputs = {
  witness: ReturnType<typeof withdrawWitnessForCoin>['witness'];
  withdrawObject: ReturnType<typeof withdrawWitnessForCoin>['withdrawObject'];
  recipientSlot: SenderTransferBuild['recipientSlot'];
  deposits: SenderTransferBuild['deposits'];
  changeCoin: SenderTransferBuild['changeCoin'];
  publicInput: SenderTransferBuild['publicInput'];
};

function confidentialEscrowFields(input: PrepareConfidentialTransferProofParameters) {
  return {
    ...(input.escrowSend ? { escrowSend: input.escrowSend } : {}),
    ...(input.escrowClaimantLimbs
      ? { escrowClaimantLimbs: input.escrowClaimantLimbs }
      : {}),
  };
}

async function buildTransferProofInputs(parameters: {
  sdk: InitializedPrivacySdk;
  applicationId: string;
  input: PrepareConfidentialTransferProofParameters;
  noteStroops: bigint;
}): Promise<TransferProofInputs> {
  const changeStroops = validateSingleCoinTransferAmounts(
    parameters.input.transferStroops,
    parameters.noteStroops,
    parameters.input.selfPrivateAddressStpl1ForChange,
  );
  const privKeyScalar = privKeyScalarDecimalFromRecipientScalarHex(
    parameters.input.senderPrivKeyScalarHex,
  );
  const { witness, withdrawObject } = withdrawWitnessForCoin({
    sdk: parameters.sdk,
    coin: parameters.input.coin,
    state: parameters.input.state,
    ownerPubHex: parameters.sdk.ecdhEphemeralPublicKeyFromScalarHex(
      parameters.input.senderPrivKeyScalarHex,
    ),
    privKeyScalar,
    applicationId: parameters.applicationId,
  });
  const stampedWithdraw = stampWithdrawEscrowLimbs(
    withdrawObject,
    sweepWithdrawStamp(confidentialEscrowFields(parameters.input)),
  );
  const { recipientSlot, deposits, changeCoin, publicInput } =
    await buildSenderTransferDepositsAndPublicInput({
      senderPrivKeyScalarHex: parameters.input.senderPrivKeyScalarHex,
      recipientPrivateAddressStpl1: parameters.input.recipientPrivateAddressStpl1,
      transferStroops: parameters.input.transferStroops,
      changeStroops,
      selfPrivateAddressStpl1ForChange:
        parameters.input.selfPrivateAddressStpl1ForChange,
      tokenAddress: parameters.input.tokenAddress,
      stateRoot: witness.stateRoot,
      ...confidentialEscrowFields(parameters.input),
    });
  return {
    witness,
    withdrawObject: stampedWithdraw,
    recipientSlot,
    deposits,
    changeCoin,
    publicInput,
  };
}

export async function prepareConfidentialTransferProof(
  parameters: PrepareConfidentialTransferProofParameters,
): Promise<PrepareConfidentialTransferProofResult> {
  const poolService = getPrivacyPoolService();
  const sdk = await poolService.getInitializedSdk();
  const applicationId = poolService.getApplicationId();
  const noteStroops = BigInt(parameters.coin.value);
  const { withdrawObject, recipientSlot, deposits, changeCoin, publicInput } =
    await buildTransferProofInputs({
      sdk,
      applicationId,
      input: parameters,
      noteStroops,
    });
  const audit = buildTransferAuditParameters({
    poolService,
    applicationId,
    nAuditSlots: sdk.getLayout().nAuditSlots,
  });
  const proof = await proveTransaction({
    sdk,
    publicInput,
    withdrawObject,
    deposits,
    audit,
  });
  return {
    ...proof,
    applicationIdsPlaintext: buildSingleTransferApplicationIds(
      sdk,
      applicationId,
      changeCoin,
    ),
    recipientCoin: generatedOutputCoinFromSlot(recipientSlot),
    ...(changeCoin ? { changeCoin } : {}),
  };
}

export { prepareConfidentialTransferProofDual } from '../../proofs/confidential/dual.js';
