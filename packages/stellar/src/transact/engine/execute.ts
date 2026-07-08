import type { WithdrawIntent } from '@arcanetech/privacy-sdk-core';
import type {
  StellarAddress,
  StellarAssetId,
  StellarPreparedOperation,
} from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import type { ProofWithChange } from '../pool/proof-types.js';
import type { PrivacyPoolService } from '../pool/service.js';
import { serializeEphemeralKeyString } from '../encoding/ephemeral-key.js';
import { buildSpendProofContextAtExecute } from './spend-proof-context.js';
import { finalizeTransferAtExecute } from './transfer-finalize.js';

function enrichWithdrawOutputRecords(
  prepared: StellarPreparedOperation,
  proof: ProofWithChange,
): void {
  if (!proof.changeCoin || prepared.outputRecords.length === 0) {
    return;
  }
  const changeCoin = proof.changeCoin;
  prepared.outputRecords = prepared.outputRecords.map((record) => ({
    ...record,
    id: changeCoin.commitment_hex,
    commitmentHex: changeCoin.commitment_hex,
    coinNote: changeCoin.coin,
    depositScalarHex: changeCoin.depositScalarHex,
    precommitementHex: changeCoin.precommitementHex,
  }));
}

async function finalizeWithdrawAtExecute(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
  poolService: PrivacyPoolService,
) {
  if (prepared.kind !== 'withdraw') {
    throw new Error('Withdraw finalize requires a withdraw operation.');
  }
  const withdrawIntent = prepared.intent as WithdrawIntent<
    StellarAddress,
    StellarAssetId,
    bigint
  >;
  const withdrawFrom = withdrawIntent.from;
  const context = await buildSpendProofContextAtExecute({
    prepared,
    environment,
    recipientPrivateAddressStpl1: withdrawFrom,
  });
  const changeStroops = BigInt(context.coin.value) - prepared.intent.amount;
  const proof = await poolService.prepareWithdrawTransactProof({
    coin: context.coin,
    state: { commitments: context.commitments },
    destinationStellarAddress: prepared.intent.to,
    privKeyScalarHex: context.senderPrivKeyScalarHex,
    depositorEphemeralKey: serializeEphemeralKeyString({
      xHex: context.ephemeral.xHex,
      yHex: context.ephemeral.yHex,
    }),
    withdrawAmountStroops: prepared.intent.amount,
    changePrivateAddressStpl1: changeStroops > 0n ? withdrawFrom : undefined,
    tokenAddress: context.tokenAddress,
  });
  enrichWithdrawOutputRecords(prepared, proof);
  return {
    proofHex: proof.proof_hex,
    publicHex: proof.public_hex,
    applicationIdsPlaintext: proof.applicationIdsPlaintext,
    tokenAddress: context.tokenAddress,
    walletPublicKey: context.walletPublicKey,
    executeFinalizeRequired: false,
  };
}

export async function finalizeSpendOperationAtExecute(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
  poolService: PrivacyPoolService,
): Promise<StellarPreparedOperation> {
  if (prepared.kind !== 'transfer' && prepared.kind !== 'withdraw') {
    return prepared;
  }
  if (prepared.transactArtifacts?.proofHex) {
    return prepared;
  }
  const artifacts =
    prepared.kind === 'transfer'
      ? await finalizeTransferAtExecute(prepared, environment)
      : await finalizeWithdrawAtExecute(prepared, environment, poolService);
  return {
    ...prepared,
    transactArtifacts: {
      ...prepared.transactArtifacts,
      ...artifacts,
    },
  };
}
