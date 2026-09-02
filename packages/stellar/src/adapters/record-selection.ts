import type { WithdrawIntent } from '@arcanetech/privacy-sdk-core';
import { insufficientStateError } from '@arcanetech/privacy-sdk-core';
import { isPrivateAddressTransferFrom } from '../transact/transfer-source/index.js';
import { requireCoinNoteFromRecord } from '../transact/private-address/record-coin.js';
import type {
  StellarAddress,
  StellarAssetId,
  StellarPrivateRecord,
  StellarStorageAdapter,
  StellarTransferFromAddress,
  StellarTransferIntent,
} from '../types.js';
import {
  buildDepositOutputRecords,
  buildWithdrawOutputRecords,
} from './transfer-output-records.js';

type SpendIntent =
  StellarTransferIntent | WithdrawIntent<StellarAddress, StellarAssetId, bigint>;

function readRecordSpendAmount(record: StellarPrivateRecord): bigint {
  const coinValue = record.coinNote?.value;
  if (coinValue !== undefined && String(coinValue).trim() !== '') {
    return BigInt(String(coinValue));
  }
  return record.amount;
}

function compareRecordsForSpendSelection(
  left: StellarPrivateRecord,
  right: StellarPrivateRecord,
): number {
  const leftValue = readRecordSpendAmount(left);
  const rightValue = readRecordSpendAmount(right);
  if (rightValue > leftValue) {
    return 1;
  }
  if (rightValue < leftValue) {
    return -1;
  }
  return left.id.localeCompare(right.id);
}

async function filterUnspentPrivateRecords(input: {
  records: StellarPrivateRecord[];
  walletPublicKey: string;
  checkNullifierSpent: (parameters: {
    nullifier: string;
    walletPublicKey: string;
    privKeyScalarHex?: string;
    privateAddressStpl1?: string;
  }) => Promise<boolean>;
}): Promise<StellarPrivateRecord[]> {
  const unspent: StellarPrivateRecord[] = [];
  for (const record of input.records) {
    if (!record.coinNote) {
      unspent.push(record);
      continue;
    }
    const coin = requireCoinNoteFromRecord(record);
    const spent = await input.checkNullifierSpent({
      nullifier: coin.nullifier,
      walletPublicKey: input.walletPublicKey,
      ...(record.privateAddress ? { privateAddressStpl1: record.privateAddress } : {}),
    });
    if (!spent) {
      unspent.push(record);
    }
  }
  return unspent;
}

function pickRecordsForSpendAmount(input: {
  available: StellarPrivateRecord[];
  kind: 'transfer' | 'withdraw';
  amount: bigint;
}): StellarPrivateRecord[] {
  let selectedTotal = 0n;
  const selected: StellarPrivateRecord[] = [];
  for (const record of input.available) {
    selected.push(record);
    selectedTotal += readRecordSpendAmount(record);
    if (selectedTotal >= input.amount) {
      return selected;
    }
    if (
      (input.kind === 'transfer' || input.kind === 'withdraw') &&
      selected.length >= 2
    ) {
      throw insufficientStateError(
        'missing_private_records',
        'Storage does not contain enough private records for this operation.',
        { requestedAmount: input.amount, availableAmount: selectedTotal },
      );
    }
  }
  throw insufficientStateError(
    'missing_private_records',
    'Storage does not contain enough private records for this operation.',
    { requestedAmount: input.amount, availableAmount: selectedTotal },
  );
}

export async function selectPrivateRecords(input: {
  storage: StellarStorageAdapter;
  kind: 'transfer' | 'withdraw';
  intent: SpendIntent;
  walletPublicKey?: string;
  checkNullifierSpent?: (parameters: {
    nullifier: string;
    walletPublicKey: string;
    privKeyScalarHex?: string;
    privateAddressStpl1?: string;
  }) => Promise<boolean>;
}): Promise<StellarPrivateRecord[]> {
  const from = input.intent.from;
  if (!isPrivateAddressTransferFrom(from)) {
    throw insufficientStateError(
      'invalid_transfer_source',
      'Private record selection requires a private address transfer source.',
    );
  }
  const spendFromPrivateAddress = from.trim().startsWith('stpl');
  const records = await input.storage.listPrivateRecords({
    ...(spendFromPrivateAddress ? { privateAddress: from } : { owner: from }),
    asset: input.intent.asset,
  });
  const locallyAvailable = [...records]
    .filter((record) => !record.consumed)
    .toSorted(compareRecordsForSpendSelection);
  const walletPublicKey = input.walletPublicKey?.trim();
  const available =
    input.checkNullifierSpent && walletPublicKey
      ? await filterUnspentPrivateRecords({
          records: locallyAvailable,
          walletPublicKey,
          checkNullifierSpent: input.checkNullifierSpent,
        })
      : locallyAvailable;

  if (available.length === 0) {
    throw insufficientStateError(
      'missing_private_records',
      'Storage does not contain enough private records for this operation.',
      { requestedAmount: input.intent.amount, availableAmount: 0n },
    );
  }

  return pickRecordsForSpendAmount({
    available,
    kind: input.kind,
    amount: input.intent.amount,
  });
}

export function sumRecordAmounts(records: StellarPrivateRecord[]): bigint {
  return records.reduce((total, record) => total + readRecordSpendAmount(record), 0n);
}

export function buildSpendOutputRecords(input: {
  kind: 'deposit' | 'withdraw';
  from: StellarTransferFromAddress;
  to: StellarAddress;
  asset: StellarAssetId;
  amount: bigint;
  consumedTotal: bigint;
  recipientDisclosedPublicly: boolean;
  walletPublicKey: StellarAddress;
}): StellarPrivateRecord[] {
  if (input.kind === 'deposit') {
    return buildDepositOutputRecords(
      input.walletPublicKey,
      input.to,
      input.asset,
      input.amount,
    );
  }
  return buildWithdrawOutputRecords(input);
}
