import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import {
  rejectPendingClaimsByIds,
  rejectPendingClaimsByOwner,
} from '../../filters/ops.js';
import { pendingClaimSchema } from '../shared.js';

const pendingClaimBridgeItemSchema = pendingClaimSchema;

export const replacePendingClaimsPageSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.replacePendingClaimsPage),
    owner: z.string().min(1),
    claims: z.array(pendingClaimBridgeItemSchema),
    paginationInfo: z.object({
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      hasMore: z.boolean(),
    }),
    count: z.number().int().nonnegative().optional(),
  })
  .transform(({ type, owner, claims, paginationInfo, count }) => ({
    type,
    operations: [
      rejectPendingClaimsByOwner(owner),
      {
        opType: 'arrayPush' as const,
        jsonPath: STELLAR_STATE_PATHS.pendingClaimsItems,
        items: claims,
      },
      {
        opType: 'primitiveSet' as const,
        jsonPath: STELLAR_STATE_PATHS.pendingClaimsPagination,
        value: paginationInfo,
      },
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.pendingClaimsCountByOwner,
        key: owner,
        value: count ?? paginationInfo.total,
      },
    ],
  }));

export const upsertPendingClaimsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.upsertPendingClaims),
    claims: z.array(pendingClaimBridgeItemSchema),
  })
  .transform(({ type, claims }) => ({
    type,
    operations: [
      rejectPendingClaimsByIds(claims.map((claim) => claim.id)),
      {
        opType: 'arrayPush' as const,
        jsonPath: STELLAR_STATE_PATHS.pendingClaimsItems,
        items: claims,
      },
    ],
  }));

export const removePendingClaimsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.removePendingClaims),
    ids: z.array(z.string().min(1)),
  })
  .transform(({ type, ids }) => ({
    type,
    operations: [rejectPendingClaimsByIds(ids)],
  }));

export const readPendingClaimsCountSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readPendingClaimsCount),
    owner: z.string().min(1),
  })
  .transform(({ type, owner }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.pendingClaimsCountByOwner,
        key: owner,
      },
    ],
  }));

export const setPendingClaimsCountSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setPendingClaimsCount),
    owner: z.string().min(1),
    count: z.number().int().nonnegative(),
  })
  .transform(({ type, owner, count }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.pendingClaimsCountByOwner,
        key: owner,
        value: count,
      },
    ],
  }));
