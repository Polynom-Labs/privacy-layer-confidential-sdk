import {
  RELAY_SIGNAL_INDEX_NULLIFIER_0,
  RELAY_SIGNAL_INDEX_NULLIFIER_1,
  RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT,
  RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT_ASSET_HI,
  RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT_ASSET_LO,
  RELAY_SIGNAL_INDEX_PUBLIC_WITHDRAWAL,
  RELAY_SIGNAL_INDEX_PUBLIC_WITHDRAWAL_ASSET_HI,
  RELAY_SIGNAL_INDEX_PUBLIC_WITHDRAWAL_ASSET_LO,
  RELAY_SIGNAL_INDEX_STATE_ROOT,
  RELAY_SIGNAL_INDEX_WITHDRAW_ADDRESS_HI,
  RELAY_SIGNAL_INDEX_WITHDRAW_ADDRESS_LO,
} from './constants.js';
import { sliceSupportedPublicSignalFields } from './signals.js';
import type { RelayTransactPackageV1 } from './types.js';

export type RelayTransactPublicLegContext = {
  stateRoot: string;
  withdrawAddressHi: string;
  withdrawAddressLo: string;
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
  const fields = sliceSupportedPublicSignalFields(prepared.publicSignals);
  return {
    orderedNullifiers: [
      fieldHex(fields, RELAY_SIGNAL_INDEX_NULLIFIER_0),
      fieldHex(fields, RELAY_SIGNAL_INDEX_NULLIFIER_1),
    ],
    publicLegContext: {
      stateRoot: fieldHex(fields, RELAY_SIGNAL_INDEX_STATE_ROOT),
      withdrawAddressHi: fieldHex(fields, RELAY_SIGNAL_INDEX_WITHDRAW_ADDRESS_HI),
      withdrawAddressLo: fieldHex(fields, RELAY_SIGNAL_INDEX_WITHDRAW_ADDRESS_LO),
      publicWithdrawalAssetHi: fieldHex(
        fields,
        RELAY_SIGNAL_INDEX_PUBLIC_WITHDRAWAL_ASSET_HI,
      ),
      publicWithdrawalAssetLo: fieldHex(
        fields,
        RELAY_SIGNAL_INDEX_PUBLIC_WITHDRAWAL_ASSET_LO,
      ),
      publicDepositAssetHi: fieldHex(
        fields,
        RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT_ASSET_HI,
      ),
      publicDepositAssetLo: fieldHex(
        fields,
        RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT_ASSET_LO,
      ),
      publicDepositAmount: fieldAmount(fields, RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT),
      publicWithdrawalAmount: fieldAmount(fields, RELAY_SIGNAL_INDEX_PUBLIC_WITHDRAWAL),
    },
  };
}
