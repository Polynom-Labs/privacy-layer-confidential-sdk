import type { StellarStateService } from '../../state/index.js';
import { createAssetsStateDelegates } from './assets.js';
import { createClaimsStateDelegates } from './claims.js';
import { createDeliveriesStateDelegates } from './deliveries.js';
import { createPoolStateDelegates } from './pool.js';
import { createRecordsStateDelegates } from './records.js';
import { createRegistryStateDelegates } from './registry.js';

export function createStateDelegates(state: StellarStateService) {
  return {
    ...createAssetsStateDelegates(state),
    ...createRegistryStateDelegates(state),
    ...createPoolStateDelegates(state),
    ...createClaimsStateDelegates(state),
    ...createDeliveriesStateDelegates(state),
    ...createRecordsStateDelegates(state),
  };
}

export type StellarPrivacyClientStateDelegates = ReturnType<
  typeof createStateDelegates
>;
