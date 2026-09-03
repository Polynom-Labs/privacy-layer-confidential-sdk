import { StrKey } from '@stellar/stellar-sdk';
import type { StellarPreparedOperation, StellarPrivateRecord } from '../../types.js';
import { assertEscrowSweepClaimant } from './assert-escrow-sweep-claimant.js';
import type { ReconstructedEscrowNote } from './reconstruct-escrow-note.js';

const PRIVATE_DISCLOSURE = {
  senderAddress: 'private' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'private' as const,
  amount: 'private' as const,
};

export type PrepareEscrowSweepInput = {
  walletPublicKey: string;
  claimantAddress: string;
  registeredPrivateAddress: string;
  reconstructed: ReconstructedEscrowNote;
  poolContract: string;
  asset: string;
};

function requireRegisteredPrivateAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || StrKey.isValidEd25519PublicKey(trimmed)) {
    throw new Error('Escrow sweep recipient must be a registered private address.');
  }
  return trimmed;
}

function consumedEscrowRecord(input: {
  reconstructed: ReconstructedEscrowNote;
  walletPublicKey: string;
  poolContract: string;
  asset: string;
}): StellarPrivateRecord {
  return {
    id: input.reconstructed.commitmentHex,
    owner: input.walletPublicKey,
    asset: input.asset,
    amount: BigInt(input.reconstructed.coin.value),
    consumed: false,
    status: 'finalized',
    poolContract: input.poolContract,
    coinNote: input.reconstructed.coin,
    privateAddress: input.reconstructed.privateAddressStpl1,
    commitmentHex: input.reconstructed.commitmentHex,
  };
}

export function attachEscrowAuthorization(
  prepared: StellarPreparedOperation,
  escrowAuthorization: string,
): StellarPreparedOperation {
  const credential = escrowAuthorization.trim();
  if (!credential) {
    throw new Error('Escrow sweep requires a signed authorization entry.');
  }
  return {
    ...prepared,
    transactArtifacts: {
      ...prepared.transactArtifacts,
      escrowAuthorization: credential,
    },
  };
}

function sweepTransactArtifacts(input: {
  claimantAddress: string;
  reconstructed: ReconstructedEscrowNote;
  walletPublicKey: string;
}): NonNullable<StellarPreparedOperation['transactArtifacts']> {
  return {
    spendSource: 'escrow',
    escrowRecipient: input.claimantAddress.trim(),
    escrowSpendScalarHex: input.reconstructed.scalarHex,
    escrowClaimantLimbs: {
      recipientHi: input.reconstructed.recipientHi,
      recipientLo: input.reconstructed.recipientLo,
      nonceDecimal: input.reconstructed.nonceDecimal,
    },
    executeFinalizeRequired: true,
    walletPublicKey: input.walletPublicKey,
  };
}

export function prepareEscrowSweepOperation(
  input: PrepareEscrowSweepInput,
): StellarPreparedOperation {
  assertEscrowSweepClaimant({
    walletPublicKey: input.walletPublicKey,
    claimantAddress: input.claimantAddress,
  });
  const walletPublicKey = input.walletPublicKey.trim();
  const registeredPrivateAddress = requireRegisteredPrivateAddress(
    input.registeredPrivateAddress,
  );
  const amount = BigInt(input.reconstructed.coin.value);
  return {
    kind: 'transfer',
    intent: {
      from: input.reconstructed.privateAddressStpl1,
      to: registeredPrivateAddress,
      asset: input.asset,
      amount,
      disclosure: PRIVATE_DISCLOSURE,
    },
    consumedRecords: [
      consumedEscrowRecord({
        reconstructed: input.reconstructed,
        walletPublicKey,
        poolContract: input.poolContract,
        asset: input.asset,
      }),
    ],
    outputRecords: [],
    submissionPayload: { operationId: crypto.randomUUID(), signed: false },
    transactArtifacts: sweepTransactArtifacts({
      claimantAddress: input.claimantAddress,
      reconstructed: input.reconstructed,
      walletPublicKey,
    }),
  };
}
