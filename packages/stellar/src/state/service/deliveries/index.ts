import type { StellarStateServiceBase } from '../base.js';
import { createIncomingDeliveryMethods } from './incoming-methods.js';
import { createDeliverySyncMethods } from './sync-methods.js';

export function createDeliveriesService(context: StellarStateServiceBase) {
  return {
    ...createIncomingDeliveryMethods(context),
    ...createDeliverySyncMethods(context),
  };
}
