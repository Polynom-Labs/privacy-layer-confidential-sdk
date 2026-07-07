import type { StateBridgeAdapter } from '@arcanetech/privacy-sdk-core/state';
import { StellarStateServiceBase } from './base.js';
import { createAssetsService } from './assets/index.js';
import { createClaimsService } from './claims/index.js';
import { createDeliveriesService } from './deliveries/index.js';
import { createPoolEphemeralService } from './pool/ephemeral.js';
import { createPoolMerkleService } from './pool/merkle.js';
import { createRecordsService } from './records/index.js';
import { createRegistryLookupService } from './registry/lookup.js';
import { createWalletAddressService } from './registry/wallet-address.js';

export function composeStellarStateService(adapter: StateBridgeAdapter) {
  const base = new StellarStateServiceBase(adapter);

  return {
    bridge: base.bridge,
    ...createAssetsService(base),
    ...createRegistryLookupService(base),
    ...createWalletAddressService(base),
    ...createPoolMerkleService(base),
    ...createPoolEphemeralService(base),
    ...createClaimsService(base),
    ...createDeliveriesService(base),
    ...createRecordsService(base),
  };
}

export type ComposedStellarStateService = ReturnType<typeof composeStellarStateService>;
