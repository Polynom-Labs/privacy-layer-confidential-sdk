import type { ArrayFilterRejectMatch } from '@arcane/privacy-sdk-core/state';
import { STELLAR_STATE_PATHS } from '../foundation/paths.js';

export const stellarArrayFilterSchemaKeys = {
  privateRecord: 'privateRecord',
  pendingClaim: 'pendingClaim',
} as const;

export function rejectPrivateRecordsByIds(ids: string[]) {
  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.privateRecords,
    itemSchemaKey: stellarArrayFilterSchemaKeys.privateRecord,
    rejectWhen: {
      op: 'fieldIn' as const,
      field: 'id',
      values: ids,
    },
  };
}

export function rejectConsumedPrivateRecords() {
  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.privateRecords,
    itemSchemaKey: stellarArrayFilterSchemaKeys.privateRecord,
    rejectWhen: {
      op: 'fieldEquals' as const,
      field: 'consumed',
      value: true,
    },
  };
}

export function rejectPendingClaimsByOwner(owner: string) {
  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.pendingClaimsItems,
    itemSchemaKey: stellarArrayFilterSchemaKeys.pendingClaim,
    rejectWhen: {
      op: 'fieldEquals' as const,
      field: 'owner',
      value: owner,
    },
  };
}

export function rejectPendingClaimsByIds(ids: string[]) {
  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.pendingClaimsItems,
    itemSchemaKey: stellarArrayFilterSchemaKeys.pendingClaim,
    rejectWhen: {
      op: 'fieldIn' as const,
      field: 'id',
      values: ids,
    },
  };
}

export function rejectPendingClaimsByOwnerAndAsset(input: {
  owner?: string | undefined;
  asset?: string | undefined;
}) {
  const matches: ArrayFilterRejectMatch[] = [];
  if (input.owner !== undefined) {
    matches.push({
      op: 'fieldEquals',
      field: 'owner',
      value: input.owner,
    });
  }
  if (input.asset !== undefined) {
    matches.push({
      op: 'fieldEquals',
      field: 'asset',
      value: input.asset,
    });
  }

  return {
    opType: 'arrayFilter' as const,
    jsonPath: STELLAR_STATE_PATHS.pendingClaimsItems,
    itemSchemaKey: stellarArrayFilterSchemaKeys.pendingClaim,
    rejectWhen: {
      op: 'and' as const,
      matches,
    },
  };
}
