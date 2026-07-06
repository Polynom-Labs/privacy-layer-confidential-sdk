import type {
  StellarAddress,
  StellarPendingClaim,
  StellarPendingClaimsFilter,
  StellarPendingClaimsState,
} from '../../../types.js';
import {
  normalizePendingClaimsCount,
  normalizePendingClaimsState,
} from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createClaimsReadMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  async function getPendingClaims(
    filter: StellarPendingClaimsFilter = {},
  ): Promise<StellarPendingClaimsState> {
    const value = await bridge.read<unknown>({
      type: stellarStateCallTypes.readPendingClaims,
    });
    const state = normalizePendingClaimsState(value);
    const items = state.items.filter((claim: StellarPendingClaim) => {
      if (filter.owner !== undefined && claim.owner !== filter.owner) {
        return false;
      }
      if (filter.asset !== undefined && claim.asset !== filter.asset) {
        return false;
      }
      return true;
    });
    if (state.pagination !== undefined) {
      return { items, pagination: state.pagination };
    }
    return { items };
  }

  return {
    getPendingClaims,

    async getPendingClaimsCount(owner: StellarAddress): Promise<number | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readPendingClaimsCount,
        owner,
      });
      const count = normalizePendingClaimsCount(value);
      if (count !== undefined) {
        return count;
      }
      const claims = await getPendingClaims({ owner });
      return claims.items.length;
    },
  };
}
