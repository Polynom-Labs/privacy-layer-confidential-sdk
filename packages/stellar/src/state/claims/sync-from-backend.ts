import type { StellarStateService } from '../index.js';
import type { StellarAddress } from '../../types.js';
import {
  fetchPendingClaimsBackendCount,
  fetchPendingClaimsBackendPage,
  mapBackendPendingClaimsPage,
  type LoadPendingClaimsCountFromBackendInput,
  type LoadPendingClaimsFromBackendInput,
} from './backend.js';

export async function syncPendingClaimsFromBackend(
  stateService: StellarStateService,
  input: LoadPendingClaimsFromBackendInput,
): Promise<void> {
  const response = await fetchPendingClaimsBackendPage(input);
  const { claims, paginationInfo } = mapBackendPendingClaimsPage(
    response,
    input.asset ?? '',
  );
  await stateService.replacePendingClaimsPage({
    owner: input.ownerAddress,
    claims,
    paginationInfo,
    count: paginationInfo.total,
  });
}

export async function syncPendingClaimsCountFromBackend(
  stateService: StellarStateService,
  ownerAddress: StellarAddress,
  input: LoadPendingClaimsCountFromBackendInput,
): Promise<void> {
  const count = await fetchPendingClaimsBackendCount(input);
  await stateService.setPendingClaimsCount(ownerAddress, count);
}
