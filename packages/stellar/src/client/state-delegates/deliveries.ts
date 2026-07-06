import type { StellarStateService } from '../../state/index.js';

export function createDeliveriesStateDelegates(state: StellarStateService) {
  return {
    getIncomingDeliveries: (
      filter: Parameters<StellarStateService['getIncomingDeliveries']>[0],
    ) => state.getIncomingDeliveries(filter),
    upsertIncomingDeliveries: (
      deliveries: Parameters<StellarStateService['upsertIncomingDeliveries']>[0],
    ) => state.upsertIncomingDeliveries(deliveries),
    markDeliveryProcessed: (
      id: Parameters<StellarStateService['markDeliveryProcessed']>[0],
    ) => state.markDeliveryProcessed(id),
    getDeliverySyncState: (
      input: Parameters<StellarStateService['getDeliverySyncState']>[0],
    ) => state.getDeliverySyncState(input),
    setDeliverySyncState: (
      syncState: Parameters<StellarStateService['setDeliverySyncState']>[0],
    ) => state.setDeliverySyncState(syncState),
  };
}
