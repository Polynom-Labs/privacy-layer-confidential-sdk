import type {
  StellarAddress,
  StellarAssetId,
  StellarPrivateAssetRow,
  StellarPrivateRecord,
  StellarPrivateRecordStatus,
} from '../../../types.js';
import { normalizePrivateRecords } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarAvailablePrivateRecordsFilter } from '../../domain/types.js';
import type { StellarStateServiceBase } from '../base.js';
import {
  mergePrivateRecords,
  privateRecordArraysEqual,
} from './private-record-upsert.js';

type PrivateRecordBridge = StellarStateServiceBase['bridge'];

async function readPrivateRecords(
  bridge: PrivateRecordBridge,
): Promise<StellarPrivateRecord[]> {
  const value = await bridge.read<unknown>({
    type: stellarStateCallTypes.listPrivateRecords,
  });
  return normalizePrivateRecords(value);
}

function writeReplacePrivateRecords(
  bridge: PrivateRecordBridge,
  records: StellarPrivateRecord[],
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.replacePrivateRecords,
    records,
  });
}

async function readAvailablePrivateRecords(
  bridge: PrivateRecordBridge,
  filter: StellarAvailablePrivateRecordsFilter,
): Promise<StellarPrivateRecord[]> {
  const records = await readPrivateRecords(bridge);
  return records.filter((record) => matchesPrivateRecordFilter(record, filter, false));
}

async function applyPrivateRecordsStatus(
  bridge: PrivateRecordBridge,
  records: StellarPrivateRecord[],
  status: StellarPrivateRecordStatus,
): Promise<void> {
  const current = await readPrivateRecords(bridge);
  const ids = new Set(records.map((record) => record.id));
  const next = current.map((record) =>
    ids.has(record.id)
      ? {
          ...record,
          status,
          consumed: status === 'spent' ? true : record.consumed,
        }
      : record,
  );
  await writeReplacePrivateRecords(bridge, next);
}

function aggregatePrivateAssetRows(
  records: StellarPrivateRecord[],
  owner: StellarAddress,
): StellarPrivateAssetRow[] {
  const available = records.filter(
    (record) => record.owner === owner && !record.consumed && record.status !== 'spent',
  );
  const byAsset = new Map<string, StellarPrivateAssetRow>();
  for (const record of available) {
    const existing = byAsset.get(record.asset);
    const amountDisplay = record.amountDisplay ?? Number(record.amount);
    if (existing) {
      existing.totalAmount += record.amount;
      existing.totalAmountDisplay += amountDisplay;
    } else {
      byAsset.set(record.asset, {
        assetId: record.asset,
        poolContract: record.poolContract ?? '',
        totalAmount: record.amount,
        totalAmountDisplay: amountDisplay,
      });
    }
  }
  return [...byAsset.values()].toSorted((left, right) =>
    left.assetId.localeCompare(right.assetId),
  );
}

function pruneConsumedPrivateRecords(bridge: PrivateRecordBridge): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.pruneConsumedPrivateRecords,
  });
}

function savePrivateRecords(
  bridge: PrivateRecordBridge,
  records: StellarPrivateRecord[],
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.savePrivateRecords,
    records,
  });
}

async function upsertPrivateRecords(
  bridge: PrivateRecordBridge,
  records: StellarPrivateRecord[],
): Promise<void> {
  if (records.length === 0) {
    return;
  }
  const current = await readPrivateRecords(bridge);
  const next = mergePrivateRecords(current, records);
  if (privateRecordArraysEqual(current, next)) {
    return;
  }
  return bridge.write({
    type: stellarStateCallTypes.upsertPrivateRecords,
    records,
  });
}

async function readPrivateBalance(
  bridge: PrivateRecordBridge,
  input: { owner: StellarAddress; asset: StellarAssetId },
): Promise<bigint> {
  const records = await readAvailablePrivateRecords(bridge, {
    owner: input.owner,
    asset: input.asset,
  });
  return records.reduce((total, record) => total + record.amount, 0n);
}

async function readPrivateAssetRows(
  bridge: PrivateRecordBridge,
  owner: StellarAddress,
): Promise<StellarPrivateAssetRow[]> {
  const records = await readPrivateRecords(bridge);
  return aggregatePrivateAssetRows(records, owner);
}

export function createPrivateRecordMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    pruneConsumedPrivateRecords: () => pruneConsumedPrivateRecords(bridge),
    getPrivateRecords: () => readPrivateRecords(bridge),
    getAvailablePrivateRecords: (filter: StellarAvailablePrivateRecordsFilter) =>
      readAvailablePrivateRecords(bridge, filter),
    listPrivateRecords: (filter: {
      owner?: StellarAddress;
      privateAddress?: string;
      asset?: StellarAssetId;
      amount?: bigint;
    }) => readAvailablePrivateRecords(bridge, filter),
    savePrivateRecords: (records: StellarPrivateRecord[]) =>
      savePrivateRecords(bridge, records),
    upsertPrivateRecords: (records: StellarPrivateRecord[]) =>
      upsertPrivateRecords(bridge, records),
    markPrivateRecordsUsed: (records: StellarPrivateRecord[]) =>
      applyPrivateRecordsStatus(bridge, records, 'spent'),
    markPrivateRecordsStatus: (
      records: StellarPrivateRecord[],
      status: StellarPrivateRecordStatus,
    ) => applyPrivateRecordsStatus(bridge, records, status),
    getPrivateBalance: (input: { owner: StellarAddress; asset: StellarAssetId }) =>
      readPrivateBalance(bridge, input),
    getPrivateAssetRows: (owner: StellarAddress) => readPrivateAssetRows(bridge, owner),
  };
}

function matchesPrivateRecordFilter(
  record: StellarPrivateRecord,
  filter: StellarAvailablePrivateRecordsFilter,
  includeConsumed: boolean,
): boolean {
  if (filter.owner !== undefined && record.owner !== filter.owner) {
    return false;
  }
  if (
    filter.privateAddress !== undefined &&
    record.privateAddress !== filter.privateAddress
  ) {
    return false;
  }
  if (filter.owner === undefined && filter.privateAddress === undefined) {
    return false;
  }
  if (filter.asset !== undefined && record.asset !== filter.asset) {
    return false;
  }
  if (!includeConsumed && (record.consumed || record.status === 'spent')) {
    return false;
  }
  return true;
}
