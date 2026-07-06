import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { rejectPrivateRecordsByIds } from '../../filters/ops.js';
import { privateRecordSchema, transactionStatusSchema } from '../shared.js';

export const upsertPrivateRecordsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.upsertPrivateRecords),
    records: z.array(privateRecordSchema),
  })
  .transform(({ type, records }) => ({
    type,
    operations: [
      rejectPrivateRecordsByIds(records.map((record) => record.id)),
      {
        opType: 'arrayPush' as const,
        jsonPath: STELLAR_STATE_PATHS.privateRecords,
        items: records,
      },
    ],
  }));

export const readTransactionStatusSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readTransactionStatus),
    txHash: z.string().min(1),
  })
  .transform(({ type, txHash }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.transactionsByHash,
        key: txHash,
      },
    ],
  }));

export const setTransactionStatusSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setTransactionStatus),
    status: transactionStatusSchema,
  })
  .transform(({ type, status }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.transactionsByHash,
        key: status.txHash,
        value: status,
      },
    ],
  }));

export const clearTransactionStatusSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.clearTransactionStatus),
    txHash: z.string().min(1),
  })
  .transform(({ type, txHash }) => ({
    type,
    operations: [
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.transactionsByHash,
        key: txHash,
      },
    ],
  }));
