import type { CoinData, StateFile } from '@auditable/privacy-pool-zk-sdk';
import { getPrivacyPoolService } from '../../pool/singleton.js';
import { buildZeroPublicLegs } from '../../proofs/transaction-input.js';
import {
  MIN_CONFIDENTIAL_TRANSFER_STROOPS,
  requireChangeRecipientWhenPartial,
  withdrawWitnessForCoin,
} from '../../proofs/confidential/helpers.js';
import { buildPoolTransactionAuditParameters } from '../../audit/parameters.js';
import type { KytApplicationIdHints } from '../../pool/proof-types.js';
import {
  buildSenderTransferDepositsAndPublicInput,
  generatedOutputCoinFromSlot,
  type GeneratedOutputCoin,
} from './shared.js';
import { parseEphemeralKeyString } from '../../encoding/ephemeral-key.js';

type PrepareConfidentialTransferProofParameters = {
  coin: CoinData;
  state: StateFile;
  senderGAddress: string;
  senderPrivKeyScalarHex: string;
  depositorEphemeralKey: string;
  transferStroops: bigint;
  recipientPrivateAddressStpl1: string;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
};

type PrepareConfidentialTransferProofResult = {
  proof_hex: string;
  public_hex: string;
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
  applicationId: string,
  changeCoin?: GeneratedOutputCoin,
): KytApplicationIdHints {
  return [applicationId, '0', applicationId, changeCoin ? applicationId : '0'];
}

function buildTransferAuditParameters(parameters: {
  poolService: ReturnType<typeof getPrivacyPoolService>;
  applicationId: string;
}) {
  const auditPublicKey = parameters.poolService.getAuditPublicKey();
  return buildPoolTransactionAuditParameters({
    applicationId: parameters.applicationId,
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
    buildZeroPublicLegs(),
    [parameters.withdrawObject, 'dummy'],
    parameters.deposits,
    parameters.audit,
  );
}

async function buildTransferProofInputs(parameters: {
  sdk: InitializedPrivacySdk;
  applicationId: string;
  input: PrepareConfidentialTransferProofParameters;
  noteStroops: bigint;
}): Promise<{
  witness: ReturnType<typeof withdrawWitnessForCoin>['witness'];
  withdrawObject: ReturnType<typeof withdrawWitnessForCoin>['withdrawObject'];
  recipientSlot: SenderTransferBuild['recipientSlot'];
  deposits: SenderTransferBuild['deposits'];
  changeCoin: SenderTransferBuild['changeCoin'];
  publicInput: SenderTransferBuild['publicInput'];
}> {
  const changeStroops = validateSingleCoinTransferAmounts(
    parameters.input.transferStroops,
    parameters.noteStroops,
    parameters.input.selfPrivateAddressStpl1ForChange,
  );
  const { witness, withdrawObject } = withdrawWitnessForCoin({
    sdk: parameters.sdk,
    coin: parameters.input.coin,
    state: parameters.input.state,
    ...parseEphemeralKeyString(parameters.input.depositorEphemeralKey),
    applicationId: parameters.applicationId,
  });
  const { recipientSlot, deposits, changeCoin, publicInput } =
    await buildSenderTransferDepositsAndPublicInput({
      senderGAddress: parameters.input.senderGAddress,
      senderPrivKeyScalarHex: parameters.input.senderPrivKeyScalarHex,
      recipientPrivateAddressStpl1: parameters.input.recipientPrivateAddressStpl1,
      transferStroops: parameters.input.transferStroops,
      changeStroops,
      selfPrivateAddressStpl1ForChange:
        parameters.input.selfPrivateAddressStpl1ForChange,
      tokenAddress: parameters.input.tokenAddress,
      stateRoot: witness.stateRoot,
    });
  return {
    witness,
    withdrawObject,
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
  const audit = buildTransferAuditParameters({ poolService, applicationId });
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
      applicationId,
      changeCoin,
    ),
    recipientCoin: generatedOutputCoinFromSlot(recipientSlot),
    ...(changeCoin ? { changeCoin } : {}),
  };
}

export { prepareConfidentialTransferProofDual } from '../../proofs/confidential/dual.js';
