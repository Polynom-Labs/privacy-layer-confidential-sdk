import type { StellarPrivateRecord } from '../../../types.js';

function privateCoinNotesEqual(
  left: StellarPrivateRecord['coinNote'],
  right: StellarPrivateRecord['coinNote'],
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return (
    left.value === right.value &&
    left.nullifier === right.nullifier &&
    left.secret === right.secret &&
    left.commitment === right.commitment &&
    left.asset_hi === right.asset_hi &&
    left.asset_lo === right.asset_lo &&
    left.application_id === right.application_id
  );
}

function privateRecordCoreFieldsEqual(
  left: StellarPrivateRecord,
  right: StellarPrivateRecord,
): boolean {
  return (
    left.id === right.id &&
    left.owner === right.owner &&
    left.asset === right.asset &&
    left.amount === right.amount &&
    left.consumed === right.consumed &&
    left.status === right.status &&
    left.poolContract === right.poolContract &&
    left.amountDisplay === right.amountDisplay
  );
}

function privateRecordChainFieldsEqual(
  left: StellarPrivateRecord,
  right: StellarPrivateRecord,
): boolean {
  return (
    left.commitmentHex === right.commitmentHex &&
    left.nullifierHex === right.nullifierHex &&
    left.deliveryId === right.deliveryId &&
    left.privateAddress === right.privateAddress &&
    left.txHash === right.txHash
  );
}

function privateRecordSecretFieldsEqual(
  left: StellarPrivateRecord,
  right: StellarPrivateRecord,
): boolean {
  return (
    left.depositScalarHex === right.depositScalarHex &&
    left.precommitementHex === right.precommitementHex &&
    privateCoinNotesEqual(left.coinNote, right.coinNote)
  );
}

function privateRecordsEqual(
  left: StellarPrivateRecord,
  right: StellarPrivateRecord,
): boolean {
  return (
    privateRecordCoreFieldsEqual(left, right) &&
    privateRecordChainFieldsEqual(left, right) &&
    privateRecordSecretFieldsEqual(left, right)
  );
}

export function privateRecordArraysEqual(
  left: StellarPrivateRecord[],
  right: StellarPrivateRecord[],
): boolean {
  return (
    left.length === right.length &&
    left.every((record, index) => {
      const rightRecord = right.at(index);
      return rightRecord !== undefined && privateRecordsEqual(record, rightRecord);
    })
  );
}

export function mergePrivateRecords(
  current: StellarPrivateRecord[],
  records: StellarPrivateRecord[],
): StellarPrivateRecord[] {
  const ids = new Set(records.map((record) => record.id));
  return [...current.filter((record) => !ids.has(record.id)), ...records];
}
