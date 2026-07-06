import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { privateAddressAssetKey } from '../../foundation/keys.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { deliverySyncStateSchema, incomingDeliverySchema } from '../shared.js';

export const readIncomingDeliveriesSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readIncomingDeliveries),
  })
  .transform(({ type }) => ({
    type,
    operations: [
      {
        opType: 'primitiveGet' as const,
        jsonPath: STELLAR_STATE_PATHS.deliveriesIncomingById,
      },
    ],
  }));

export const upsertIncomingDeliveriesSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.upsertIncomingDeliveries),
    deliveries: z.array(incomingDeliverySchema),
  })
  .transform(({ type, deliveries }) => ({
    type,
    operations: deliveries.map((delivery) => ({
      opType: 'recordSet' as const,
      jsonPath: STELLAR_STATE_PATHS.deliveriesIncomingById,
      key: String(delivery.id),
      value: delivery,
    })),
  }));

export const readDeliverySyncStateSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readDeliverySyncState),
    privateAddress: z.string().min(1),
    asset: z.string().min(1),
  })
  .transform(({ type, privateAddress, asset }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.deliveriesSync,
        key: privateAddressAssetKey(privateAddress, asset),
      },
    ],
  }));

export const setDeliverySyncStateSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setDeliverySyncState),
    syncState: deliverySyncStateSchema,
  })
  .transform(({ type, syncState }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.deliveriesSync,
        key: privateAddressAssetKey(syncState.privateAddress, syncState.asset),
        value: syncState,
      },
    ],
  }));
