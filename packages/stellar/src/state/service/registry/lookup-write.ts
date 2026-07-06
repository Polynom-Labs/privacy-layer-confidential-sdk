import type { StellarAddress, StellarRegistryLookup } from '../../../types.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createRegistryLookupWriteMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  async function invalidateRegistryLookup(address: StellarAddress): Promise<void> {
    return bridge.write({
      type: stellarStateCallTypes.invalidateRegistryLookup,
      address,
    });
  }

  return {
    saveRegistryLookup(lookup: StellarRegistryLookup): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.saveRegistryLookup,
        lookup,
      });
    },

    saveRegisteredPrivateAddress(input: {
      address: StellarAddress;
      privateAddress: string;
      registered: boolean;
    }): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.saveRegisteredPrivateAddress,
        address: input.address,
        privateAddress: input.privateAddress,
        registered: input.registered,
      });
    },

    invalidateRegistryLookup,

    invalidateRegisteredAddress(address: StellarAddress): Promise<void> {
      return invalidateRegistryLookup(address);
    },
  };
}
