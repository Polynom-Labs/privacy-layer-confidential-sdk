import type { StellarPreparedOperation } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import {
  resolveTransferOnboardingAtExecute,
  resolveTransferRecipientForExecute,
} from './prepare/transfer-helpers.js';
import {
  verifyPendingClaimBeforeExecute,
  verifyPrivateRecordsNullifiersBeforeExecute,
} from '../transfer-source/index.js';
import { buildPendingClaimOnboardingPayload } from '../onboarding/build-pending-claim-payload.js';
import { readRegistryLookupFromChain } from '../../contracts/registry/registry-domain-service.js';
import { requireContractContext } from '../../contracts/contract-context.js';
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

async function resolvePendingClaimOnboardingAtExecute(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
}) {
  const claim = input.prepared.transactArtifacts?.pendingClaim;
  if (!claim || input.prepared.kind !== 'transfer') {
    return;
  }
  const contractContext = requireContractContext(input.environment);
  const lookup = await readRegistryLookupFromChain({
    contractContext,
    owner: input.walletPublicKey.trim(),
    walletPublicKey: input.walletPublicKey.trim(),
  });
  if (lookup.status === 'registered') {
    return;
  }
  return buildPendingClaimOnboardingPayload({
    claim,
    permanentPrivateAddressStpl1: input.prepared.intent.to.trim(),
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

async function resolveTransferOnboardingBundle(input: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
  recipient: Awaited<ReturnType<typeof resolveTransferRecipientForExecute>>;
  recipientCoin: Awaited<
    ReturnType<typeof prepareConfidentialTransferProof>
  >['recipientCoin']['coin'];
  tokenAddress: string;
}) {
  const pendingClaim = input.prepared.transactArtifacts?.pendingClaim;
  if (pendingClaim) {
    const pendingOnboarding = await resolvePendingClaimOnboardingAtExecute({
      prepared: input.prepared,
      environment: input.environment,
      walletPublicKey: input.walletPublicKey,
    });
    if (pendingOnboarding) {
      return pendingOnboarding;
    }
  }
  return resolveTransferOnboardingAtExecute({
    prepared: input.prepared,
    environment: input.environment,
    recipient: input.recipient,
    recipientCoin: input.recipientCoin,
    tokenAddress: input.tokenAddress,
  });
}

function buildTransferFinalizeArtifacts(input: {
  proof: Awaited<ReturnType<typeof prepareConfidentialTransferProof>>;
  context: Awaited<ReturnType<typeof buildSpendProofContextAtExecute>>;
  onboarding: Awaited<ReturnType<typeof resolveTransferOnboardingBundle>>;
}) {
  return {
    proofHex: input.proof.proof_hex,
    publicHex: input.proof.public_hex,
    applicationIdsPlaintext: input.proof.applicationIdsPlaintext,
    tokenAddress: input.context.tokenAddress,
    walletPublicKey: input.context.walletPublicKey,
    onboarding: input.onboarding,
    executeFinalizeRequired: false,
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
  const onboarding = await resolveTransferOnboardingBundle({
    prepared: input.prepared,
    environment: input.environment,
    walletPublicKey: input.walletPublicKey,
    recipient,
    recipientCoin: proof.recipientCoin.coin,
    tokenAddress: context.tokenAddress,
  });
  enrichTransferOutputRecords(input.prepared, proof);
  return buildTransferFinalizeArtifacts({ proof, context, onboarding });
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
