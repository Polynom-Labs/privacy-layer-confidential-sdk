import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import {
  clearTransactionStatusSchema,
  readTransactionStatusSchema,
  setTransactionStatusSchema,
} from '../schemas/records/transactions.js';
import { stellarStateCallTypes } from '../bridge/call-types.js';

export const stellarTransactionStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.readTransactionStatus,
    mode: 'read',
    schema: readTransactionStatusSchema,
  },
  {
    type: stellarStateCallTypes.setTransactionStatus,
    mode: 'write',
    schema: setTransactionStatusSchema,
  },
  {
    type: stellarStateCallTypes.clearTransactionStatus,
    mode: 'write',
    schema: clearTransactionStatusSchema,
  },
];
