import type {
  StellarIncomingDeliveriesFilter,
  StellarIncomingDelivery,
} from '../../../types.js';
import { normalizeIncomingDeliveries } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createIncomingDeliveryMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  async function getIncomingDeliveries(
    filter: StellarIncomingDeliveriesFilter,
  ): Promise<StellarIncomingDelivery[]> {
    const values = await bridge.read<unknown>({
      type: stellarStateCallTypes.readIncomingDeliveries,
    });
    const deliveries = normalizeIncomingDeliveries(values);
    return deliveries.filter((delivery: StellarIncomingDelivery) => {
      if (delivery.privateAddress !== filter.privateAddress) {
        return false;
      }
      if (filter.asset !== undefined && delivery.asset !== filter.asset) {
        return false;
      }
      if (!filter.includeProcessed && delivery.processed) {
        return false;
      }
      return true;
    });
  }

  function upsertIncomingDeliveries(
    deliveries: StellarIncomingDelivery[],
  ): Promise<void> {
    return bridge.write({
      type: stellarStateCallTypes.upsertIncomingDeliveries,
      deliveries,
    });
  }

  return {
    getIncomingDeliveries,
    upsertIncomingDeliveries,

    async markDeliveryProcessed(id: number): Promise<void> {
      const deliveries = await bridge.read<unknown>({
        type: stellarStateCallTypes.readIncomingDeliveries,
      });
      const match = normalizeIncomingDeliveries(deliveries).find(
        (delivery: StellarIncomingDelivery) => delivery.id === id,
      );
      if (!match) {
        return;
      }
      await upsertIncomingDeliveries([{ ...match, processed: true }]);
    },
  };
}
