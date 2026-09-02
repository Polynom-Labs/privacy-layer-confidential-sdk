import type { StellarPreparedOperation } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import { resolveTransferRecipientForExecute } from './prepare/transfer-helpers.js';
import {
  verifyPendingClaimBeforeExecute,
  verifyPrivateRecordsNullifiersBeforeExecute,
} from '../transfer-source/index.js';
import { buildTransferProofAtExecute } from './transfer-proof-at-execute.js';
import type { buildSpendProofContextAtExecute } from './spend-proof-context.js';
import type { prepareConfidentialTransferProof } from '../proofs/confidential/single.js';

function enrichTransferOutputRecords(
  prepared: StellarPreparedOperation,
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>,
): void {
  if (prepared.outputRecords.length === 0) {
    return;
  }
  const generatedOutputCoins = [
    proof.recipientCoin,
    ...(proof.changeCoin ? [proof.changeCoin] : []),
  ];
  prepared.outputRecords = prepared.outputRecords.map((record, index) => {
    const generatedCoin = generatedOutputCoins.at(index);
    if (!generatedCoin) {
      return record;
    }
    return {
      ...record,
      id: generatedCoin.commitment_hex,
      commitmentHex: generatedCoin.commitment_hex,
      coinNote: generatedCoin.coin,
      depositScalarHex: generatedCoin.depositScalarHex,
      precommitementHex: generatedCoin.precommitementHex,
    };
  });
}

async function ensurePendingClaimReadyForExecute(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
}): Promise<void> {
  const pendingClaim = input.prepared.transactArtifacts?.pendingClaim;
  if (!pendingClaim) {
    return;
  }
  await verifyPendingClaimBeforeExecute({
    claim: pendingClaim,
    environment: input.environment,
    walletPublicKey: input.walletPublicKey,
  });
}

function buildTransferFinalizeArtifacts(input: {
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>;
  context: Awaited<ReturnType<typeof buildSpendProofContextAtExecute>>;
  escrowRecipient?: string;
}) {
  return {
    proofHex: input.proof.proof_hex,
    publicHex: input.proof.public_hex,
    applicationIdsPlaintext: input.proof.applicationIdsPlaintext,
    tokenAddress: input.context.tokenAddress,
    walletPublicKey: input.context.walletPublicKey,
    executeFinalizeRequired: false,
    ...(input.escrowRecipient ? { escrowRecipient: input.escrowRecipient } : {}),
  };
}

async function runTransferFinalizeSteps(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
}) {
  const recipient = await resolveTransferRecipientForExecute(
    input.prepared,
    input.environment,
    input.walletPublicKey,
  );
  await verifyPrivateRecordsNullifiersBeforeExecute({
    records: input.prepared.consumedRecords,
    environment: input.environment,
    walletPublicKey: input.walletPublicKey,
  });
  const { context, proof } = await buildTransferProofAtExecute({
    prepared: input.prepared,
    environment: input.environment,
    recipientPrivateAddressStpl1: recipient.recipientPrivateAddressStpl1,
  });
  enrichTransferOutputRecords(input.prepared, proof);
  const escrowRecipient = recipient.recipientStellarAddress?.trim();
  return buildTransferFinalizeArtifacts({
    proof,
    context,
    ...(escrowRecipient ? { escrowRecipient } : {}),
  });
}

export async function finalizeTransferAtExecute(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
) {
  const [primaryRecord] = prepared.consumedRecords;
  if (!primaryRecord?.owner.trim()) {
    throw new Error('Transfer execution record owner is missing.');
  }
  const walletPublicKey = primaryRecord.owner.trim();
  await ensurePendingClaimReadyForExecute({
    prepared,
    environment,
    walletPublicKey,
  });
  return runTransferFinalizeSteps({ prepared, environment, walletPublicKey });
}
