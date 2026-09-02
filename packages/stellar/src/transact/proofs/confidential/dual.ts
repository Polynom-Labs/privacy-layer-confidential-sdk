import type { CoinData, StateFile } from '@auditable/privacy-pool-zk-sdk';
import { getPrivacyPoolService } from '../../pool/singleton.js';
import { buildZeroPublicLegs } from '../../proofs/transaction-input.js';
import {
  changeStroopsAfterDualTransfer,
  dualWithdrawLegsWithSharedRoot,
  requireChangeRecipientWhenPartial,
} from '../../proofs/confidential/helpers.js';
import { buildPoolTransactionAuditParameters } from '../../audit/parameters.js';
import type { KytApplicationIdHints } from '../../pool/proof-types.js';
import {
  buildSenderTransferDepositsAndPublicInput,
  generatedOutputCoinFromSlot,
  type GeneratedOutputCoin,
} from './shared.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../../encoding/priv-key-scalar-from-recipient-hex.js';

type PrepareConfidentialTransferProofDualParameters = {
  coinA: CoinData;
  coinB: CoinData;
  state: StateFile;
  senderGAddress: string;
  senderPrivKeyScalarHex: string;
  ephemeralAKey: string;
  ephemeralBKey: string;
  transferStroops: bigint;
  recipientPrivateAddressStpl1: string;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
};

type PrepareConfidentialTransferProofDualResult = {
  proof_hex: string;
  public_hex: string;
  applicationIdsPlaintext: KytApplicationIdHints;
  recipientCoin: GeneratedOutputCoin;
  changeCoin?: GeneratedOutputCoin;
};

function buildDualTransferApplicationIds(
  applicationId: string,
  changeCoin?: GeneratedOutputCoin,
): KytApplicationIdHints {
  return [
    applicationId,
    applicationId,
    applicationId,
    changeCoin ? applicationId : '0',
  ];
}

async function proveDualConfidentialTransfer(parameters: {
  sdk: Awaited<
    ReturnType<ReturnType<typeof getPrivacyPoolService>['getInitializedSdk']>
  >;
  publicInput: Awaited<
    ReturnType<typeof buildSenderTransferDepositsAndPublicInput>
  >['publicInput'];
  legA: Awaited<ReturnType<typeof dualWithdrawLegsWithSharedRoot>>['legA'];
  legB: Awaited<ReturnType<typeof dualWithdrawLegsWithSharedRoot>>['legB'];
  deposits: Awaited<
    ReturnType<typeof buildSenderTransferDepositsAndPublicInput>
  >['deposits'];
  applicationId: string;
  auditPublicKey?: [string, string];
}) {
  const audit = buildPoolTransactionAuditParameters({
    applicationId: parameters.applicationId,
    ...(parameters.auditPublicKey ? { auditPublicKey: parameters.auditPublicKey } : {}),
  });
  return parameters.sdk.proveTransaction(
    parameters.publicInput as unknown as Parameters<
      typeof parameters.sdk.proveTransaction
    >[0],
    buildZeroPublicLegs(),
    [parameters.legA.withdrawObject, parameters.legB.withdrawObject],
    parameters.deposits,
    audit,
  );
}

async function buildDualTransferProofContext(
  parameters: PrepareConfidentialTransferProofDualParameters,
  applicationId: string,
  sdk: Awaited<
    ReturnType<ReturnType<typeof getPrivacyPoolService>['getInitializedSdk']>
  >,
) {
  const totalNotes = BigInt(parameters.coinA.value) + BigInt(parameters.coinB.value);
  const changeStroops = changeStroopsAfterDualTransfer(
    parameters.transferStroops,
    totalNotes,
  );
  requireChangeRecipientWhenPartial(
    changeStroops,
    parameters.selfPrivateAddressStpl1ForChange,
  );
  const privKeyScalar = privKeyScalarDecimalFromRecipientScalarHex(
    parameters.senderPrivKeyScalarHex,
  );
  const ownerPubHex = sdk.ecdhEphemeralPublicKeyFromScalarHex(
    parameters.senderPrivKeyScalarHex,
  );
  const { legA, legB } = dualWithdrawLegsWithSharedRoot({
    sdk,
    coinA: parameters.coinA,
    coinB: parameters.coinB,
    state: parameters.state,
    ownerPubHex,
    privKeyScalar,
    applicationId,
  });
  const transferInputs = await buildSenderTransferDepositsAndPublicInput({
    senderGAddress: parameters.senderGAddress,
    senderPrivKeyScalarHex: parameters.senderPrivKeyScalarHex,
    recipientPrivateAddressStpl1: parameters.recipientPrivateAddressStpl1,
    transferStroops: parameters.transferStroops,
    changeStroops,
    selfPrivateAddressStpl1ForChange: parameters.selfPrivateAddressStpl1ForChange,
    tokenAddress: parameters.tokenAddress,
    stateRoot: legA.witness.stateRoot,
  });
  return { legA, legB, applicationId, ...transferInputs };
}

export async function prepareConfidentialTransferProofDual(
  parameters: PrepareConfidentialTransferProofDualParameters,
): Promise<PrepareConfidentialTransferProofDualResult> {
  const poolService = getPrivacyPoolService();
  const sdk = await poolService.getInitializedSdk();
  const applicationId = poolService.getApplicationId();
  const { legA, legB, recipientSlot, deposits, changeCoin, publicInput } =
    await buildDualTransferProofContext(parameters, applicationId, sdk);
  const auditPublicKey = poolService.getAuditPublicKey();
  const proof = await (auditPublicKey
    ? proveDualConfidentialTransfer({
        sdk,
        publicInput,
        legA,
        legB,
        deposits,
        applicationId,
        auditPublicKey,
      })
    : proveDualConfidentialTransfer({
        sdk,
        publicInput,
        legA,
        legB,
        deposits,
        applicationId,
      }));
  return {
    ...proof,
    applicationIdsPlaintext: buildDualTransferApplicationIds(applicationId, changeCoin),
    recipientCoin: generatedOutputCoinFromSlot(recipientSlot),
    ...(changeCoin ? { changeCoin } : {}),
  };
}
