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

function stampEscrowOutputRecords(input: {
  prepared: StellarPreparedOperation;
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>;
  walletPublicKey: string;
  escrowSendPrivateAddress?: string;
}): void {
  if (input.escrowSendPrivateAddress) {
    const [recipientRecord, ...rest] = input.prepared.outputRecords;
    if (recipientRecord) {
      input.prepared.outputRecords = [
        {
          ...recipientRecord,
          privateAddress: input.escrowSendPrivateAddress,
        },
        ...rest,
      ];
    }
  }
  seedEscrowSweepOutputsFromProof({
    prepared: input.prepared,
    proof: input.proof,
    walletPublicKey: input.walletPublicKey,
  });
  enrichTransferOutputRecords(input.prepared, input.proof);
}

function seedEscrowSweepOutputsFromProof(input: {
  prepared: StellarPreparedOperation;
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>;
  walletPublicKey: string;
}): void {
  if (
    input.prepared.transactArtifacts?.spendSource !== 'escrow' ||
    input.prepared.outputRecords.length > 0
  ) {
    return;
  }
  input.prepared.outputRecords = [
    {
      id: input.proof.recipientCoin.commitment_hex,
      owner: input.walletPublicKey,
      privateAddress: input.prepared.intent.to,
      asset: input.prepared.intent.asset,
      amount: input.prepared.intent.amount,
      consumed: false,
    },
  ];
}

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

function escrowSpendArtifacts(input: {
  escrowSend?: boolean;
  preparedSpendSource?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['spendSource'];
}) {
  if (input.escrowSend) {
    return { escrowSend: true as const, spendSource: 'escrow' as const };
  }
  if (input.preparedSpendSource === 'escrow') {
    return { spendSource: 'escrow' as const };
  }
  return {};
}

function buildTransferFinalizeArtifacts(input: {
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>;
  context: Awaited<ReturnType<typeof buildSpendProofContextAtExecute>>;
  escrowSend?: boolean;
  preparedSpendSource?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['spendSource'];
}) {
  return {
    proofHex: input.proof.proof_hex,
    publicHex: input.proof.public_hex,
    applicationIdsPlaintext: input.proof.applicationIdsPlaintext,
    tokenAddress: input.context.tokenAddress,
    walletPublicKey: input.context.walletPublicKey,
    executeFinalizeRequired: false,
    ...escrowSpendArtifacts(input),
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
    ...(recipient.escrowSend ? { escrowSend: recipient.escrowSend } : {}),
    ...(input.prepared.transactArtifacts?.escrowClaimantLimbs
      ? {
          escrowClaimantLimbs: input.prepared.transactArtifacts.escrowClaimantLimbs,
        }
      : {}),
  });
  stampEscrowOutputRecords({
    prepared: input.prepared,
    proof,
    walletPublicKey: input.walletPublicKey,
    ...(recipient.escrowSend
      ? { escrowSendPrivateAddress: recipient.recipientPrivateAddressStpl1 }
      : {}),
  });
  return buildTransferFinalizeArtifacts({
    proof,
    context,
    ...(recipient.escrowSend ? { escrowSend: true } : {}),
    ...(input.prepared.transactArtifacts?.spendSource
      ? { preparedSpendSource: input.prepared.transactArtifacts.spendSource }
      : {}),
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
