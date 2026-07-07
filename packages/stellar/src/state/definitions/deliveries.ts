import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  readDeliverySyncStateSchema,
  readIncomingDeliveriesSchema,
  setDeliverySyncStateSchema,
  upsertIncomingDeliveriesSchema,
} from '../schemas/claims/deliveries.js';

export const stellarDeliveriesStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.readIncomingDeliveries,
    mode: 'read',
    schema: readIncomingDeliveriesSchema,
  },
  {
    type: stellarStateCallTypes.upsertIncomingDeliveries,
    mode: 'write',
    schema: upsertIncomingDeliveriesSchema,
  },
  {
    type: stellarStateCallTypes.readDeliverySyncState,
    mode: 'read',
    schema: readDeliverySyncStateSchema,
  },
  {
    type: stellarStateCallTypes.setDeliverySyncState,
    mode: 'write',
    schema: setDeliverySyncStateSchema,
  },
];
