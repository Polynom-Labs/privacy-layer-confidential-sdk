import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { rejectConsumedPrivateRecords } from '../../filters/ops.js';
import { privateRecordSchema } from '../shared.js';

export const listPrivateRecordsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.listPrivateRecords),
  })
  .transform(({ type }) => ({
    type,
    operations: [
      {
        opType: 'primitiveGet' as const,
        jsonPath: STELLAR_STATE_PATHS.privateRecords,
      },
    ],
  }));

export const savePrivateRecordsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.savePrivateRecords),
    records: z.array(privateRecordSchema),
  })
  .transform(({ type, records }) => ({
    type,
    operations: [
      {
        opType: 'arrayPush' as const,
        jsonPath: STELLAR_STATE_PATHS.privateRecords,
        items: records,
      },
    ],
  }));

export const replacePrivateRecordsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.replacePrivateRecords),
    records: z.array(privateRecordSchema),
  })
  .transform(({ type, records }) => ({
    type,
    operations: [
      {
        opType: 'arrayClean' as const,
        jsonPath: STELLAR_STATE_PATHS.privateRecords,
      },
      {
        opType: 'arrayPush' as const,
        jsonPath: STELLAR_STATE_PATHS.privateRecords,
        items: records,
      },
    ],
  }));

export const pruneConsumedPrivateRecordsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.pruneConsumedPrivateRecords),
  })
  .transform(({ type }) => ({
    type,
    operations: [rejectConsumedPrivateRecords()],
  }));
