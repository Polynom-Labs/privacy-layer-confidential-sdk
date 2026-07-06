import { z } from 'zod';
import { privateRecordSchema, transactionStatusSchema } from '../../schemas/shared.js';
import type {
  StellarPrivateRecord,
  StellarTransactionStatus,
} from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizePrivateRecords(value: unknown): StellarPrivateRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const records = value.flatMap((item) => {
    const parsed = privateRecordSchema.safeParse(item);
    return parsed.success ? [normalizePrivateRecordFields(parsed.data)] : [];
  });
  return deduplicatePrivateRecords(records);
}

export function normalizeTransactionStatus(
  value: unknown,
): StellarTransactionStatus | undefined {
  const parsed = transactionStatusSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarTransactionStatus)
    : undefined;
}

function privateRecordCommitmentKey(record: StellarPrivateRecord): string {
  return (
    record.commitmentHex?.trim() ||
    record.coinNote?.commitment.trim() ||
    record.id.trim()
  )
    .replace(/^0x/iu, '')
    .toLowerCase();
}

function normalizePrivateRecordFields(
  record: z.infer<typeof privateRecordSchema>,
): StellarPrivateRecord {
  const normalized = withoutUndefinedFields(record) as StellarPrivateRecord;
  if (!normalized.privateAddress && normalized.owner.trim().startsWith('stpl')) {
    return { ...normalized, privateAddress: normalized.owner.trim() };
  }
  return normalized;
}

function preferPrivateRecord(
  current: StellarPrivateRecord,
  incoming: StellarPrivateRecord,
  key: string,
): StellarPrivateRecord {
  if (privateRecordIdKey(incoming) === key) {
    return incoming;
  }
  if (privateRecordIdKey(current) === key) {
    return current;
  }
  return incoming;
}

function privateRecordIdKey(record: StellarPrivateRecord): string {
  return record.id.trim().replace(/^0x/iu, '').toLowerCase();
}

function deduplicatePrivateRecords(
  records: StellarPrivateRecord[],
): StellarPrivateRecord[] {
  const byCommitment = new Map<string, StellarPrivateRecord>();
  for (const record of records) {
    const key = privateRecordCommitmentKey(record);
    const current = byCommitment.get(key);
    byCommitment.set(key, current ? preferPrivateRecord(current, record, key) : record);
  }
  return [...byCommitment.values()];
}
