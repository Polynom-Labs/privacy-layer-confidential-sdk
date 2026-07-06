import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { rejectPendingClaimsByOwnerAndAsset } from '../../filters/ops.js';
import { paginationSchema, pendingClaimSchema } from '../shared.js';

export const pendingClaimsWriteSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.pendingClaims),
    claims: z.array(pendingClaimSchema),
    paginationInfo: paginationSchema,
  })
  .transform(({ type, claims, paginationInfo }) => ({
    type,
    operations: [
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
    ],
  }));

export const clearPendingClaimsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.clearPendingClaims),
    owner: z.string().optional(),
    asset: z.string().optional(),
  })
  .transform(({ type, owner, asset }) => {
    if (owner === undefined && asset === undefined) {
      return {
        type,
        operations: [
          {
            opType: 'arrayClean' as const,
            jsonPath: STELLAR_STATE_PATHS.pendingClaimsItems,
          },
        ],
      };
    }

    return {
      type,
      operations: [rejectPendingClaimsByOwnerAndAsset({ owner, asset })],
    };
  });

export const readPendingClaimsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readPendingClaims),
  })
  .transform(({ type }) => ({
    type,
    operations: [
      {
        opType: 'primitiveGet' as const,
        jsonPath: '$.pendingClaims',
      },
    ],
  }));
