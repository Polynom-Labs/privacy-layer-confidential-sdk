import type { StellarStateService } from '../../state/index.js';

export function createRegistryStateDelegates(state: StellarStateService) {
  return {
    getRegistryLookup: (
      address: Parameters<StellarStateService['getRegistryLookup']>[0],
    ) => state.getRegistryLookup(address),
    isStellarAddressRegistered: (
      address: Parameters<StellarStateService['isStellarAddressRegistered']>[0],
    ) => state.isStellarAddressRegistered(address),
    getCachedPrivateAddress: (
      address: Parameters<StellarStateService['getCachedPrivateAddress']>[0],
    ) => state.getCachedPrivateAddress(address),
    saveRegistryLookup: (
      lookup: Parameters<StellarStateService['saveRegistryLookup']>[0],
    ) => state.saveRegistryLookup(lookup),
    getWalletPrivateAddressScalar: (
      input: Parameters<StellarStateService['getWalletPrivateAddressScalar']>[0],
    ) => state.getWalletPrivateAddressScalar(input),
    saveWalletPrivateAddressScalar: (
      scalar: Parameters<StellarStateService['saveWalletPrivateAddressScalar']>[0],
    ) => state.saveWalletPrivateAddressScalar(scalar),
    getWalletPrivateAddressRecord: (
      input: Parameters<StellarStateService['getWalletPrivateAddressRecord']>[0],
    ) => state.getWalletPrivateAddressRecord(input),
    saveWalletPrivateAddressRecord: (
      record: Parameters<StellarStateService['saveWalletPrivateAddressRecord']>[0],
    ) => state.saveWalletPrivateAddressRecord(record),
    getWalletDefaultPrivateAddressNonce: (
      owner: Parameters<StellarStateService['getWalletDefaultPrivateAddressNonce']>[0],
    ) => state.getWalletDefaultPrivateAddressNonce(owner),
    setWalletDefaultPrivateAddressNonce: (
      input: Parameters<StellarStateService['setWalletDefaultPrivateAddressNonce']>[0],
    ) => state.setWalletDefaultPrivateAddressNonce(input),
    deleteWalletPrivateAddressScalar: (
      input: Parameters<StellarStateService['deleteWalletPrivateAddressScalar']>[0],
    ) => state.deleteWalletPrivateAddressScalar(input),
    saveRegisteredPrivateAddress: (
      input: Parameters<StellarStateService['saveRegisteredPrivateAddress']>[0],
    ) => state.saveRegisteredPrivateAddress(input),
    invalidateRegistryLookup: (
      address: Parameters<StellarStateService['invalidateRegistryLookup']>[0],
    ) => state.invalidateRegistryLookup(address),
    invalidateRegisteredAddress: (
      address: Parameters<StellarStateService['invalidateRegisteredAddress']>[0],
    ) => state.invalidateRegisteredAddress(address),
  };
}
