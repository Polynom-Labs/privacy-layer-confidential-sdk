import type {
  StellarPrivateRecord,
  StellarWalletPrivateAddressRecord,
  StellarWalletPrivateAddressScalar,
} from '../domain/types.js';
import {
  normalizePrivateRecords,
  normalizeWalletDefaultPrivateAddressNonce,
  normalizeWalletPrivateAddressRecord,
  normalizeWalletPrivateAddressScalar,
} from './normalize.js';

type SnapshotRoot = Record<string, unknown>;
type WalletMapKey =
  'privateAddressScalars' | 'privateAddressRecords' | 'defaultPrivateAddressNonce';

function readSnapshotObject(value: unknown): SnapshotRoot | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as SnapshotRoot;
}

function resolveSdkSnapshot(value: unknown): SnapshotRoot | undefined {
  const record = readSnapshotObject(value);
  if (!record) {
    return undefined;
  }
  const branch = readSnapshotObject(record.privacySdkState);
  return branch ?? record;
}

function readWalletSnapshot(value: unknown): SnapshotRoot | undefined {
  const sdk = resolveSdkSnapshot(value);
  if (!sdk) {
    return undefined;
  }
  return readSnapshotObject(sdk.wallet);
}

function readWalletMap(value: unknown, key: WalletMapKey): SnapshotRoot | undefined {
  const wallet = readWalletSnapshot(value);
  if (!wallet) {
    return undefined;
  }
  if (key === 'privateAddressScalars') {
    return readSnapshotObject(wallet.privateAddressScalars);
  }
  if (key === 'privateAddressRecords') {
    return readSnapshotObject(wallet.privateAddressRecords);
  }
  return readSnapshotObject(wallet.defaultPrivateAddressNonce);
}

function readRecordValue(record: SnapshotRoot, key: string): unknown {
  for (const [entryKey, entryValue] of Object.entries(record)) {
    if (entryKey === key) {
      return entryValue;
    }
  }
  return undefined;
}

function ownerNonceKey(owner: string, nonce: string): string {
  return `${owner.trim()}:${nonce.trim()}`;
}

export function readPrivateRecordsFromStateSnapshot(
  state: unknown,
): StellarPrivateRecord[] {
  const sdk = resolveSdkSnapshot(state);
  if (!sdk) {
    return [];
  }
  return normalizePrivateRecords(sdk.privateRecords);
}

export function readWalletPrivateAddressScalarFromStateSnapshot(input: {
  state: unknown;
  owner: string;
  nonce: string;
}): StellarWalletPrivateAddressScalar | undefined {
  const owner = input.owner.trim();
  const nonce = input.nonce.trim();
  if (!owner || !nonce) {
    return undefined;
  }
  const scalars = readWalletMap(input.state, 'privateAddressScalars');
  if (!scalars) {
    return undefined;
  }
  const value = scalars[ownerNonceKey(owner, nonce)];
  if (typeof value === 'string') {
    const scalarHex = value.trim();
    return scalarHex ? { owner, nonce, scalarHex } : undefined;
  }
  return normalizeWalletPrivateAddressScalar(value);
}

export function readWalletPrivateAddressRecordFromStateSnapshot(input: {
  state: unknown;
  owner: string;
  nonce: string;
}): StellarWalletPrivateAddressRecord | undefined {
  const owner = input.owner.trim();
  const nonce = input.nonce.trim();
  if (!owner || !nonce) {
    return undefined;
  }
  const records = readWalletMap(input.state, 'privateAddressRecords');
  if (!records) {
    return undefined;
  }
  return normalizeWalletPrivateAddressRecord(records[ownerNonceKey(owner, nonce)]);
}

export function readWalletDefaultPrivateAddressNonceFromStateSnapshot(input: {
  state: unknown;
  owner: string;
}): string | undefined {
  const owner = input.owner.trim();
  if (!owner) {
    return undefined;
  }
  const defaults = readWalletMap(input.state, 'defaultPrivateAddressNonce');
  if (!defaults) {
    return undefined;
  }
  return normalizeWalletDefaultPrivateAddressNonce(readRecordValue(defaults, owner));
}

export function listWalletPrivateAddressScalarsForOwnerFromStateSnapshot(input: {
  state: unknown;
  owner: string;
}): StellarWalletPrivateAddressScalar[] {
  const owner = input.owner.trim();
  if (!owner) {
    return [];
  }
  const scalars = readWalletMap(input.state, 'privateAddressScalars');
  if (!scalars) {
    return [];
  }
  const prefix = `${owner}:`;
  return Object.keys(scalars).flatMap((key) => {
    if (!key.startsWith(prefix)) {
      return [];
    }
    const nonce = key.slice(prefix.length).trim();
    if (!nonce) {
      return [];
    }
    const entry = readWalletPrivateAddressScalarFromStateSnapshot({
      state: input.state,
      owner,
      nonce,
    });
    return entry ? [entry] : [];
  });
}

export function listWalletPrivateAddressRecordsForOwnerFromStateSnapshot(input: {
  state: unknown;
  owner: string;
}): StellarWalletPrivateAddressRecord[] {
  const owner = input.owner.trim();
  if (!owner) {
    return [];
  }
  const records = readWalletMap(input.state, 'privateAddressRecords');
  if (!records) {
    return [];
  }
  const prefix = `${owner}:`;
  return Object.keys(records).flatMap((key) => {
    if (!key.startsWith(prefix)) {
      return [];
    }
    const nonce = key.slice(prefix.length).trim();
    if (!nonce) {
      return [];
    }
    const entry = readWalletPrivateAddressRecordFromStateSnapshot({
      state: input.state,
      owner,
      nonce,
    });
    return entry ? [entry] : [];
  });
}
