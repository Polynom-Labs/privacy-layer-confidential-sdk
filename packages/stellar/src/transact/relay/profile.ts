import { relayLayoutProfileForNonce } from './layout-profile.js';
import { sliceSupportedPublicSignalFields } from './signals.js';
import type { RelayTransactPackageV1 } from './types.js';

export type RelayTransactPublicLegContext = {
  stateRoot: string;
  withdrawAddressHi: string;
  withdrawAddressLo: string;
  escrowRecipientHi: string;
  escrowRecipientLo: string;
  publicWithdrawalAssetHi: string;
  publicWithdrawalAssetLo: string;
  publicDepositAssetHi: string;
  publicDepositAssetLo: string;
  publicDepositAmount: string;
  publicWithdrawalAmount: string;
};

export type RelayTransactSupportedProfile = {
  orderedNullifiers: [string, string];
  publicLegContext: RelayTransactPublicLegContext;
};

function fieldAt(fields: readonly Buffer[], index: number): Buffer {
  const field = fields.find((_unused, offset) => offset === index);
  if (!field) {
    throw new Error(`Missing packed public signal at index ${String(index)}.`);
  }
  return field;
}

function fieldHex(fields: readonly Buffer[], index: number): string {
  return fieldAt(fields, index).toString('hex');
}

function fieldAmount(fields: readonly Buffer[], index: number): string {
  return BigInt(`0x${fieldAt(fields, index).toString('hex')}`).toString();
}

export function readRelayTransactSupportedProfile(
  prepared: RelayTransactPackageV1,
): RelayTransactSupportedProfile {
  const layout = relayLayoutProfileForNonce(prepared.zkConfigNonce);
  const fields = sliceSupportedPublicSignalFields(
    prepared.publicSignals,
    prepared.zkConfigNonce,
  );
  const { indices } = layout;
  return {
    orderedNullifiers: [
      fieldHex(fields, indices.nullifier0),
      fieldHex(fields, indices.nullifier1),
    ],
    publicLegContext: {
      stateRoot: fieldHex(fields, indices.stateRoot),
      withdrawAddressHi: fieldHex(fields, indices.withdrawAddressHi),
      withdrawAddressLo: fieldHex(fields, indices.withdrawAddressLo),
      escrowRecipientHi: fieldHex(fields, indices.escrowRecipientHi),
      escrowRecipientLo: fieldHex(fields, indices.escrowRecipientLo),
      publicWithdrawalAssetHi: fieldHex(fields, indices.publicWithdrawalAssetHi),
      publicWithdrawalAssetLo: fieldHex(fields, indices.publicWithdrawalAssetLo),
      publicDepositAssetHi: fieldHex(fields, indices.publicDepositAssetHi),
      publicDepositAssetLo: fieldHex(fields, indices.publicDepositAssetLo),
      publicDepositAmount: fieldAmount(fields, indices.publicDeposit),
      publicWithdrawalAmount: fieldAmount(fields, indices.publicWithdrawal),
    },
  };
}
