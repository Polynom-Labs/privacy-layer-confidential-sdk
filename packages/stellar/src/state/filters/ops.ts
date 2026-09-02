import { STELLAR_STATE_PATHS } from '../foundation/paths.js';

export const stellarArrayFilterSchemaKeys = {
  privateRecord: 'privateRecord',
} as const;

export function rejectPrivateRecordsByIds(ids: string[]) {
  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.privateRecords,
    itemSchemaKey: stellarArrayFilterSchemaKeys.privateRecord,
    rejectWhen: {
      op: 'fieldIn' as const,
      field: 'id',
      values: ids,
    },
  };
}

export function rejectConsumedPrivateRecords() {
  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.privateRecords,
    itemSchemaKey: stellarArrayFilterSchemaKeys.privateRecord,
    rejectWhen: {
      op: 'fieldEquals' as const,
      field: 'consumed',
      value: true,
    },
  };
}
