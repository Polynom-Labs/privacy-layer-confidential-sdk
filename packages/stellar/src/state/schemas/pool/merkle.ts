import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { poolLeafKey } from '../../foundation/keys.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { leafEphemeralSchema, poolMerkleStateSchema } from '../shared.js';

export const readPoolMerkleStateSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readPoolMerkleState),
    poolContract: z.string().min(1),
  })
  .transform(({ type, poolContract }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.poolsByContract,
        key: poolContract,
      },
    ],
  }));

export const setPoolMerkleStateSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setPoolMerkleState),
    state: poolMerkleStateSchema,
  })
  .transform(({ type, state }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.poolsByContract,
        key: state.poolContract,
        value: state,
      },
    ],
  }));

export const readLeafEphemeralSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readLeafEphemeral),
    poolContract: z.string().min(1),
    leafIndex: z.number().int().nonnegative(),
  })
  .transform(({ type, poolContract, leafIndex }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.poolsLeafEphemeral,
        key: poolLeafKey(poolContract, leafIndex),
      },
    ],
  }));

export const setLeafEphemeralSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setLeafEphemeral),
    ephemeral: leafEphemeralSchema,
  })
  .transform(({ type, ephemeral }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.poolsLeafEphemeral,
        key: poolLeafKey(ephemeral.poolContract, ephemeral.leafIndex),
        value: ephemeral,
      },
    ],
  }));
