import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  listPrivateRecordsSchema,
  pruneConsumedPrivateRecordsSchema,
  replacePrivateRecordsSchema,
  savePrivateRecordsSchema,
} from '../schemas/records/private.js';
import { upsertPrivateRecordsSchema } from '../schemas/records/transactions.js';

export const stellarRecordsStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.listPrivateRecords,
    mode: 'read',
    schema: listPrivateRecordsSchema,
  },
  {
    type: stellarStateCallTypes.savePrivateRecords,
    mode: 'write',
    schema: savePrivateRecordsSchema,
  },
  {
    type: stellarStateCallTypes.replacePrivateRecords,
    mode: 'write',
    schema: replacePrivateRecordsSchema,
  },
  {
    type: stellarStateCallTypes.upsertPrivateRecords,
    mode: 'write',
    schema: upsertPrivateRecordsSchema,
  },
  {
    type: stellarStateCallTypes.pruneConsumedPrivateRecords,
    mode: 'write',
    schema: pruneConsumedPrivateRecordsSchema,
  },
];
