import { Buffer } from 'buffer';
import type { CoinData } from '@auditable/privacy-pool-zk-sdk';
import {
  insufficientStateError,
  invalidIntentError,
} from '@arcanetech/privacy-sdk-core';
import type { StellarPendingClaim, StellarPrivateRecord } from '../../types.js';
import {
  isPendingClaimSource,
  type StellarPendingClaimSource,
  type StellarTransferFromAddress,
} from './types.js';

const FIELD_HEX_LENGTH = 64;
const SCALAR_HEX_PATTERN = new RegExp(`^(0x)?[0-9a-f]{${FIELD_HEX_LENGTH}}$`, 'iu');

function hexToDecimal(hex: string | undefined): string {
  const clean = (hex ?? '').trim().replace(/^0x/u, '');
  return BigInt(`0x${clean || '0'}`).toString();
}

export function recoveryScalarHexFromClaim(claim: StellarPendingClaim): string {
  const encoded = claim.encryptedRecoveryBase64?.trim();
  if (!encoded) {
    throw invalidIntentError(
      'from',
      'Pending claim is missing encrypted recovery data.',
    );
  }
  const scalar = Buffer.from(encoded, 'base64').toString('utf8').trim();
  if (!SCALAR_HEX_PATTERN.test(scalar)) {
    throw invalidIntentError('from', 'Pending claim recovery payload is not a scalar.');
  }
  return scalar.replace(/^0x/iu, '');
}

export function pendingClaimToCoin(claim: StellarPendingClaim): CoinData {
  return {
    value: claim.amount.toString(),
    nullifier: hexToDecimal(claim.nullifierFieldHex),
    secret: hexToDecimal(claim.secretHex),
    commitment: hexToDecimal(claim.commitmentHex),
    asset_hi: hexToDecimal(claim.assetHiHex),
    asset_lo: hexToDecimal(claim.assetLoHex),
  };
}

export function pendingClaimToConsumedRecord(input: {
  claim: StellarPendingClaim;
  walletPublicKey: string;
  poolContract: string;
}): StellarPrivateRecord {
  const coin = pendingClaimToCoin(input.claim);
  return {
    id: `pending-claim-${input.claim.id}`,
    owner: input.walletPublicKey.trim(),
    asset: input.claim.asset,
    amount: input.claim.amount,
    consumed: false,
    status: 'finalized',
    poolContract: input.poolContract,
    commitmentHex: input.claim.commitmentHex,
    nullifierHex: input.claim.nullifierHex ?? input.claim.futureNullifierHashHex,
    coinNote: coin,
  };
}

function readPendingClaimFromSource(
  source: StellarPendingClaimSource,
): StellarPendingClaim | undefined {
  if ('claim' in source) {
    return source.claim;
  }
  return undefined;
}

export async function resolvePendingClaimSource(input: {
  from: StellarPendingClaimSource;
  walletPublicKey: string;
  getPendingClaims: () => Promise<{ items: StellarPendingClaim[] }>;
}): Promise<StellarPendingClaim> {
  const embedded = readPendingClaimFromSource(input.from);
  if (embedded) {
    return embedded;
  }
  if (!('claimId' in input.from)) {
    throw invalidIntentError('from', 'Pending claim id is required.');
  }
  const claimId = input.from.claimId.trim();
  if (!claimId) {
    throw invalidIntentError('from', 'Pending claim id is required.');
  }
  const claims = await input.getPendingClaims();
  const claim = claims.items.find((entry) => entry.id === claimId);
  if (!claim) {
    throw insufficientStateError(
      'pending_claim_not_found',
      'Pending claim was not found in local state.',
      { claimId },
    );
  }
  return claim;
}

export function assertPendingClaimOwner(input: {
  claim: StellarPendingClaim;
  walletPublicKey: string;
}): void {
  const owner = input.claim.owner.trim();
  const wallet = input.walletPublicKey.trim();
  if (owner !== wallet) {
    throw insufficientStateError(
      'pending_claim_owner_mismatch',
      'Pending claim owner does not match the connected wallet.',
      { claimOwner: owner, walletPublicKey: wallet },
    );
  }
}

export function readTransferFromPrivateAddress(
  from: StellarTransferFromAddress,
): string {
  if (isPendingClaimSource(from)) {
    throw invalidIntentError(
      'from',
      'Private address is unavailable for a pending claim transfer source.',
    );
  }
  return from.trim();
}
