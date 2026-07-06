import type {
  StellarAddress,
  StellarAssetId,
  StellarPendingClaim,
  StellarPendingClaimsPagination,
} from '../../../types.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

type ClaimsWriteBridge = StellarStateServiceBase['bridge'];

function appendPendingClaims(
  bridge: ClaimsWriteBridge,
  claims: StellarPendingClaim[],
  paginationInfo: StellarPendingClaimsPagination,
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.pendingClaims,
    claims,
    paginationInfo,
  });
}

function replacePendingClaimsPage(
  bridge: ClaimsWriteBridge,
  input: {
    owner: StellarAddress;
    claims: StellarPendingClaim[];
    paginationInfo: StellarPendingClaimsPagination;
    count?: number;
  },
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.replacePendingClaimsPage,
    owner: input.owner,
    claims: input.claims,
    paginationInfo: input.paginationInfo,
    ...(input.count === undefined ? {} : { count: input.count }),
  });
}

function upsertPendingClaims(
  bridge: ClaimsWriteBridge,
  claims: StellarPendingClaim[],
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.upsertPendingClaims,
    claims,
  });
}

function removePendingClaims(bridge: ClaimsWriteBridge, ids: string[]): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.removePendingClaims,
    ids,
  });
}

function clearPendingClaims(
  bridge: ClaimsWriteBridge,
  input: {
    owner?: StellarAddress;
    asset?: StellarAssetId;
  } = {},
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.clearPendingClaims,
    ...(input.owner === undefined ? {} : { owner: input.owner }),
    ...(input.asset === undefined ? {} : { asset: input.asset }),
  });
}

function setPendingClaimsCount(
  bridge: ClaimsWriteBridge,
  owner: StellarAddress,
  count: number,
): Promise<void> {
  return bridge.write({
    type: stellarStateCallTypes.setPendingClaimsCount,
    owner,
    count,
  });
}

export function createClaimsWriteMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    appendPendingClaims: (
      claims: StellarPendingClaim[],
      paginationInfo: StellarPendingClaimsPagination,
    ) => appendPendingClaims(bridge, claims, paginationInfo),
    replacePendingClaimsPage: (input: {
      owner: StellarAddress;
      claims: StellarPendingClaim[];
      paginationInfo: StellarPendingClaimsPagination;
      count?: number;
    }) => replacePendingClaimsPage(bridge, input),
    upsertPendingClaims: (claims: StellarPendingClaim[]) =>
      upsertPendingClaims(bridge, claims),
    removePendingClaims: (ids: string[]) => removePendingClaims(bridge, ids),
    clearPendingClaims: (
      input: { owner?: StellarAddress; asset?: StellarAssetId } = {},
    ) => clearPendingClaims(bridge, input),
    setPendingClaimsCount: (owner: StellarAddress, count: number) =>
      setPendingClaimsCount(bridge, owner, count),
  };
}
