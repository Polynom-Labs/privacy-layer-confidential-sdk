import { insufficientStateError } from '@arcane/privacy-sdk-core';
import {
  assertPendingClaimOwner,
  isPendingClaimSource,
  pendingClaimToConsumedRecord,
  resolvePendingClaimSource,
  type StellarPendingClaimSource,
  assertPrivateRecordsNullifiersAvailable,
} from '../transact/transfer-source/index.js';
import { pendingClaimToCoin } from '../transact/transfer-source/resolve.js';
import type {
  StellarPendingClaim,
  StellarPreparedOperation,
  StellarPrivateRecord,
  StellarStorageAdapter,
  StellarTransactEngine,
  StellarTransferIntent,
  StellarWalletAdapter,
} from '../types.js';
import { buildTransferOutputRecords } from './transfer-output-records.js';
import { selectPrivateRecords, sumRecordAmounts } from './record-selection.js';

export type TransferPrepareDeps = {
  storage: StellarStorageAdapter;
  wallet: StellarWalletAdapter;
  engine: StellarTransactEngine;
  poolContract: string;
  getPendingClaims?: () => Promise<{ items: StellarPendingClaim[] }>;
  checkNullifierSpent?: (input: {
    nullifier: string;
    walletPublicKey: string;
  }) => Promise<boolean>;
};

export async function prepareTransferOperation(
  intent: StellarTransferIntent,
  deps: TransferPrepareDeps,
): Promise<StellarPreparedOperation> {
  const walletAddress = await deps.wallet.getAddress();
  const walletPublicKey = walletAddress.trim();
  const spend = isPendingClaimSource(intent.from)
    ? await resolvePendingClaimSpend(intent, deps, walletPublicKey)
    : await resolvePrivateAddressSpend(intent, deps);
  const consumedTotal = sumRecordAmounts(spend.consumedRecords);
  const prepared: StellarPreparedOperation = {
    kind: 'transfer',
    intent,
    consumedRecords: spend.consumedRecords,
    outputRecords: buildTransferOutputRecords(intent, consumedTotal, walletPublicKey),
    submissionPayload: {
      operationId: crypto.randomUUID(),
      signed: false,
    },
    transactArtifacts: spend.transactArtifacts,
  };
  return deps.engine.prepare(prepared);
}

async function resolvePendingClaimSpend(
  intent: StellarTransferIntent,
  deps: TransferPrepareDeps,
  walletPublicKey: string,
): Promise<{
  consumedRecords: StellarPrivateRecord[];
  transactArtifacts: StellarPreparedOperation['transactArtifacts'];
}> {
  if (!deps.getPendingClaims) {
    throw insufficientStateError(
      'pending_claim_state_unavailable',
      'Pending claim state is not available for this transfer.',
    );
  }
  const claim = await resolvePendingClaimSource({
    from: intent.from as StellarPendingClaimSource,
    walletPublicKey,
    getPendingClaims: deps.getPendingClaims,
  });
  assertPendingClaimOwner({ claim, walletPublicKey });
  await assertPendingClaimNullifierAvailable({
    claim,
    walletPublicKey,
    checkNullifierSpent: deps.checkNullifierSpent,
  });
  validatePendingClaimIntentMatches(claim, intent);
  return {
    consumedRecords: [
      pendingClaimToConsumedRecord({
        claim,
        walletPublicKey,
        poolContract: deps.poolContract,
      }),
    ],
    transactArtifacts: {
      pendingClaim: claim,
      spendSource: 'pendingClaim',
      executeFinalizeRequired: true,
    },
  };
}

async function resolvePrivateAddressSpend(
  intent: StellarTransferIntent,
  deps: TransferPrepareDeps,
): Promise<{
  consumedRecords: StellarPrivateRecord[];
  transactArtifacts: StellarPreparedOperation['transactArtifacts'];
}> {
  const walletAddress = await deps.wallet.getAddress();
  const walletPublicKey = walletAddress.trim();
  const consumedRecords = await selectPrivateRecords({
    storage: deps.storage,
    kind: 'transfer',
    intent,
    walletPublicKey,
    checkNullifierSpent: deps.checkNullifierSpent,
  });
  await assertPrivateRecordsNullifiersAvailable({
    records: consumedRecords,
    walletPublicKey: walletAddress.trim(),
    checkNullifierSpent: deps.checkNullifierSpent,
  });
  return {
    consumedRecords,
    transactArtifacts: {
      spendSource: 'privateAddress',
    },
  };
}

function validatePendingClaimIntentMatches(
  claim: StellarPendingClaim,
  intent: StellarTransferIntent,
): void {
  if (claim.amount !== intent.amount) {
    throw insufficientStateError(
      'pending_claim_amount_mismatch',
      'Transfer amount must match the pending claim amount.',
      { claimAmount: claim.amount, requestedAmount: intent.amount },
    );
  }
  if (claim.asset !== intent.asset) {
    throw insufficientStateError(
      'pending_claim_asset_mismatch',
      'Transfer asset must match the pending claim asset.',
    );
  }
}

async function assertPendingClaimNullifierAvailable(input: {
  claim: StellarPendingClaim;
  walletPublicKey: string;
  checkNullifierSpent?: (input: {
    nullifier: string;
    walletPublicKey: string;
  }) => Promise<boolean>;
}): Promise<void> {
  if (!input.checkNullifierSpent) {
    return;
  }
  const nullifier = pendingClaimToCoin(input.claim).nullifier;
  const spent = await input.checkNullifierSpent({
    nullifier,
    walletPublicKey: input.walletPublicKey,
  });
  if (spent) {
    throw insufficientStateError(
      'pending_claim_nullifier_spent',
      'Pending claim nullifier was already spent on-chain.',
    );
  }
}
