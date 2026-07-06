import {
  isPendingClaimSource,
  isPrivateAddressTransferFrom,
  readTransferFromPrivateAddress,
} from '../transact/transfer-source/index.js';
import type {
  StellarAddress,
  StellarAssetId,
  StellarPrivateRecord,
  StellarTransferFromAddress,
  StellarTransferIntent,
} from '../types.js';

export function buildTransferOutputRecords(
  intent: StellarTransferIntent,
  consumedTotal: bigint,
  walletPublicKey: StellarAddress,
): StellarPrivateRecord[] {
  const recipientOwner = recipientOutputOwner(intent, walletPublicKey);
  if (isPendingClaimSource(intent.from)) {
    return [
      createOutputRecord({
        ...recipientOwner,
        asset: intent.asset,
        amount: intent.amount,
      }),
    ];
  }
  const changeAmount = consumedTotal - intent.amount;
  const outputs = [
    createOutputRecord({
      ...recipientOwner,
      asset: intent.asset,
      amount: intent.amount,
    }),
  ];
  if (changeAmount > 0n && isPrivateAddressTransferFrom(intent.from)) {
    outputs.push(
      createOutputRecord({
        owner: walletPublicKey,
        privateAddress: intent.from,
        asset: intent.asset,
        amount: changeAmount,
      }),
    );
  }
  return outputs;
}

export function buildWithdrawOutputRecords(input: {
  from: StellarTransferFromAddress;
  to: StellarAddress;
  asset: StellarAssetId;
  amount: bigint;
  consumedTotal: bigint;
  recipientDisclosedPublicly: boolean;
  walletPublicKey: StellarAddress;
}): StellarPrivateRecord[] {
  const changeAmount = input.consumedTotal - input.amount;
  if (input.recipientDisclosedPublicly) {
    if (changeAmount > 0n) {
      return [
        createOutputRecord({
          owner: input.walletPublicKey,
          privateAddress: readTransferFromPrivateAddress(input.from),
          asset: input.asset,
          amount: changeAmount,
        }),
      ];
    }
    return [];
  }
  const outputs = [
    createOutputRecord({
      owner: input.to,
      asset: input.asset,
      amount: input.amount,
    }),
  ];
  if (changeAmount > 0n && isPrivateAddressTransferFrom(input.from)) {
    outputs.push(
      createOutputRecord({
        owner: input.walletPublicKey,
        privateAddress: input.from,
        asset: input.asset,
        amount: changeAmount,
      }),
    );
  }
  return outputs;
}

export function buildDepositOutputRecords(
  owner: StellarAddress,
  privateAddress: string,
  asset: StellarAssetId,
  amount: bigint,
): StellarPrivateRecord[] {
  return [createOutputRecord({ owner, privateAddress, asset, amount })];
}

/**
 * The recipient of a private-disclosure transfer is only known by their private
 * (`stpl`) address, which must never populate `owner`. Such records are booked
 * under the sending wallet's own Stellar address until/unless the recipient's
 * Stellar address is resolved (public-disclosure transfers already carry it in
 * `intent.to`).
 */
function recipientOutputOwner(
  intent: StellarTransferIntent,
  walletPublicKey: StellarAddress,
): { owner: StellarAddress; privateAddress?: string } {
  if (intent.disclosure.recipientAddress === 'public') {
    return { owner: intent.to.trim() };
  }
  return { owner: walletPublicKey, privateAddress: intent.to.trim() };
}

function createOutputRecord(input: {
  owner: StellarAddress;
  privateAddress?: string;
  asset: StellarAssetId;
  amount: bigint;
}): StellarPrivateRecord {
  return {
    id: pendingOutputRecordId(input.owner, input.asset, input.amount),
    owner: input.owner,
    ...(input.privateAddress ? { privateAddress: input.privateAddress } : {}),
    asset: input.asset,
    amount: input.amount,
    consumed: false,
  };
}

/**
 * Placeholder id used before the real commitment hash is known; execution
 * enrichment always overwrites this with `coinNote`'s commitment hash before
 * the record is persisted. Must never be a random uuid.
 */
function pendingOutputRecordId(
  owner: StellarAddress,
  asset: StellarAssetId,
  amount: bigint,
): string {
  return `pending-output:${owner}:${asset}:${amount}`;
}
