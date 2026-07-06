import type { StellarAssetId, StellarDeliverySyncState } from '../../../types.js';
import { normalizeDeliverySyncState } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createDeliverySyncMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    async getDeliverySyncState(input: {
      privateAddress: string;
      asset: StellarAssetId;
    }): Promise<StellarDeliverySyncState | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readDeliverySyncState,
        privateAddress: input.privateAddress,
        asset: input.asset,
      });
      return normalizeDeliverySyncState(value);
    },

    setDeliverySyncState(syncState: StellarDeliverySyncState): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.setDeliverySyncState,
        syncState,
      });
    },
  };
}
