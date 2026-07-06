import type {
  LoadPendingClaimsCountFromBackendInput,
  LoadPendingClaimsFromBackendInput,
} from '../../pending-claims-backend.js';
import {
  syncPendingClaimsCountFromBackend,
  syncPendingClaimsFromBackend,
} from '../../pending-claims-state-sync.js';
import type { StellarStateService } from '../../state/index.js';

export function createClaimsStateDelegates(state: StellarStateService) {
  return {
    appendPendingClaims: (
      claims: Parameters<StellarStateService['appendPendingClaims']>[0],
      paginationInfo: Parameters<StellarStateService['appendPendingClaims']>[1],
    ) => state.appendPendingClaims(claims, paginationInfo),
    loadPendingClaimsFromBackend: (input: LoadPendingClaimsFromBackendInput) =>
      syncPendingClaimsFromBackend(state, input),
    loadPendingClaimsCountFromBackend: (
      input: LoadPendingClaimsCountFromBackendInput,
    ) => syncPendingClaimsCountFromBackend(state, input.ownerAddress, input),
    replacePendingClaimsPage: (
      input: Parameters<StellarStateService['replacePendingClaimsPage']>[0],
    ) => state.replacePendingClaimsPage(input),
    upsertPendingClaims: (
      claims: Parameters<StellarStateService['upsertPendingClaims']>[0],
    ) => state.upsertPendingClaims(claims),
    removePendingClaims: (
      ids: Parameters<StellarStateService['removePendingClaims']>[0],
    ) => state.removePendingClaims(ids),
    clearPendingClaims: (
      input: Parameters<StellarStateService['clearPendingClaims']>[0] = {},
    ) => state.clearPendingClaims(input),
    getPendingClaims: (
      filter: Parameters<StellarStateService['getPendingClaims']>[0] = {},
    ) => state.getPendingClaims(filter),
    getPendingClaimsCount: (
      owner: Parameters<StellarStateService['getPendingClaimsCount']>[0],
    ) => state.getPendingClaimsCount(owner),
    setPendingClaimsCount: (
      owner: Parameters<StellarStateService['setPendingClaimsCount']>[0],
      count: Parameters<StellarStateService['setPendingClaimsCount']>[1],
    ) => state.setPendingClaimsCount(owner, count),
  };
}
