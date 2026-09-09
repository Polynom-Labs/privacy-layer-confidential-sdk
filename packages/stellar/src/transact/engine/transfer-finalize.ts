import type { StellarPreparedOperation } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import { resolveTransferRecipientForExecute } from './prepare/transfer-helpers.js';
import { verifyPrivateRecordsNullifiersBeforeExecute } from '../transfer-source/index.js';
import { nullifierCheckSpendScalarHex } from '../escrow/require-escrow-spend-scalar.js';
import { buildTransferProofAtExecute } from './transfer-proof-at-execute.js';
import type { buildSpendProofContextAtExecute } from './spend-proof-context.js';
import type { prepareConfidentialTransferProof } from '../proofs/confidential/single.js';
import { ciphertextArtifactsFromProof } from '../pool/proof-types.js';

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

function escrowSpendArtifacts(input: {
  escrowSend?: boolean;
  escrowRecipient?: string;
  escrowSpendScalarHex?: string;
  preparedSpendSource?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['spendSource'];
  escrowClaimantLimbs?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['escrowClaimantLimbs'];
}) {
  if (input.escrowSend) {
    return {
      escrowSend: true as const,
      spendSource: 'escrow' as const,
      ...(input.escrowRecipient ? { escrowRecipient: input.escrowRecipient } : {}),
    };
  }
  if (input.preparedSpendSource === 'escrow') {
    return {
      spendSource: 'escrow' as const,
      ...(input.escrowRecipient ? { escrowRecipient: input.escrowRecipient } : {}),
      ...(input.escrowSpendScalarHex
        ? { escrowSpendScalarHex: input.escrowSpendScalarHex }
        : {}),
      ...(input.escrowClaimantLimbs
        ? { escrowClaimantLimbs: input.escrowClaimantLimbs }
        : {}),
    };
  }
  return {};
}

function buildTransferFinalizeArtifacts(input: {
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>;
  context: Awaited<ReturnType<typeof buildSpendProofContextAtExecute>>;
  escrowSend?: boolean;
  escrowRecipient?: string;
  escrowSpendScalarHex?: string;
  preparedSpendSource?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['spendSource'];
  escrowClaimantLimbs?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['escrowClaimantLimbs'];
}) {
  return {
    proofHex: input.proof.proof_hex,
    publicHex: input.proof.public_hex,
    ...ciphertextArtifactsFromProof(input.proof),
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
  const spendScalarHex = nullifierCheckSpendScalarHex(input.prepared.transactArtifacts);
  await verifyPrivateRecordsNullifiersBeforeExecute({
    records: input.prepared.consumedRecords,
    environment: input.environment,
    walletPublicKey: input.walletPublicKey,
    ...(spendScalarHex ? { spendScalarHex } : {}),
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
    ...sweepFinalizeStamp(input.prepared, recipient),
  });
}

function sweepArtifactStamp(artifacts: StellarPreparedOperation['transactArtifacts']) {
  return {
    ...(artifacts?.escrowSpendScalarHex
      ? { escrowSpendScalarHex: artifacts.escrowSpendScalarHex }
      : {}),
    ...(artifacts?.spendSource ? { preparedSpendSource: artifacts.spendSource } : {}),
    ...(artifacts?.escrowClaimantLimbs
      ? { escrowClaimantLimbs: artifacts.escrowClaimantLimbs }
      : {}),
  };
}

function sweepFinalizeStamp(
  prepared: StellarPreparedOperation,
  recipient: Awaited<ReturnType<typeof resolveTransferRecipientForExecute>>,
) {
  const artifacts = prepared.transactArtifacts;
  const fromSend = recipient.escrowSend?.recipientStellarAddress?.trim();
  const escrowRecipient = fromSend || artifacts?.escrowRecipient?.trim();
  return {
    ...(recipient.escrowSend ? { escrowSend: true as const } : {}),
    ...(escrowRecipient ? { escrowRecipient } : {}),
    ...sweepArtifactStamp(artifacts),
  };
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
  return runTransferFinalizeSteps({ prepared, environment, walletPublicKey });
}
