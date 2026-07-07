import type { StateBridgeAdapter } from '@arcanetech/privacy-sdk-core/state';
import type { StellarStorageAdapter } from '../../types.js';
import {
  composeStellarStateService,
  type ComposedStellarStateService,
} from './compose.js';

export type StellarStateService = ComposedStellarStateService;

export function createStellarStateService(
  adapter: StateBridgeAdapter,
): StellarStateService {
  return composeStellarStateService(adapter);
}

export function createStellarStorageAdapterFromState(
  state: StellarStateService,
): StellarStorageAdapter {
  return {
    listPrivateRecords: (filter) => state.listPrivateRecords(filter),
    savePrivateRecords: (records) => state.savePrivateRecords(records),
    markPrivateRecordsUsed: (records) => state.markPrivateRecordsUsed(records),
  };
}
