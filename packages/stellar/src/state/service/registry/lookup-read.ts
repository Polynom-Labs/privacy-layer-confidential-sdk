import type { StellarAddress, StellarRegistryLookup } from '../../../types.js';
import {
  normalizeCachedPrivateAddress,
  normalizeRegistryLookup,
  normalizeRegistryLookupFromLegacy,
} from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

type RegistryLookupBridge = StellarStateServiceBase['bridge'];

async function readRegistryLookup(
  bridge: RegistryLookupBridge,
  address: StellarAddress,
): Promise<StellarRegistryLookup | undefined> {
  try {
    const value = await bridge.read<unknown>({
      type: stellarStateCallTypes.readRegistryLookup,
      address,
    });
    const lookup = normalizeRegistryLookup(value);
    if (lookup) {
      return lookup;
    }
  } catch {
    // Legacy states may not have $.registry.lookups yet.
  }
  let registered: unknown;
  let privateAddress: unknown;
  try {
    registered = await bridge.read<unknown>({
      type: stellarStateCallTypes.readStellarAddressRegistered,
      address,
    });
  } catch {
    registered = undefined;
  }
  try {
    privateAddress = await bridge.read<unknown>({
      type: stellarStateCallTypes.readCachedPrivateAddress,
      address,
    });
  } catch {
    privateAddress = undefined;
  }
  return normalizeRegistryLookupFromLegacy({
    address,
    registered,
    privateAddress,
  });
}

async function readCachedPrivateAddress(
  bridge: RegistryLookupBridge,
  address: StellarAddress,
): Promise<string | undefined> {
  const lookup = await readRegistryLookup(bridge, address);
  if (lookup?.privateAddressStpl1) {
    return lookup.privateAddressStpl1;
  }
  const value = await bridge.read<unknown>({
    type: stellarStateCallTypes.readCachedPrivateAddress,
    address,
  });
  return normalizeCachedPrivateAddress(value);
}

export function createRegistryLookupReadMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    getRegistryLookup: (address: StellarAddress) => readRegistryLookup(bridge, address),

    async isStellarAddressRegistered(
      address: StellarAddress,
    ): Promise<boolean | undefined> {
      const lookup = await readRegistryLookup(bridge, address);
      if (lookup === undefined) {
        return undefined;
      }
      return lookup.status === 'registered';
    },

    getCachedPrivateAddress: (address: StellarAddress) =>
      readCachedPrivateAddress(bridge, address),
  };
}
