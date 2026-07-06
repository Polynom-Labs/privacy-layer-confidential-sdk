import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { ownerAssetKey } from '../../foundation/keys.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { publicBalanceSchema } from '../shared.js';

export const readPublicBalanceSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readPublicBalance),
    owner: z.string().min(1),
    asset: z.string().min(1),
  })
  .transform(({ type, owner, asset }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.publicBalances,
        key: ownerAssetKey(owner, asset),
      },
    ],
  }));

export const readPublicBalancesSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readPublicBalances),
    owner: z.string().min(1),
  })
  .transform(({ type }) => ({
    type,
    operations: [
      {
        opType: 'recordEntries' as const,
        jsonPath: STELLAR_STATE_PATHS.publicBalances,
      },
    ],
  }));

export const setPublicBalanceSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setPublicBalance),
    balance: publicBalanceSchema,
  })
  .transform(({ type, balance }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.publicBalances,
        key: ownerAssetKey(balance.owner, balance.asset),
        value: balance,
      },
    ],
  }));

export const setPublicBalancesSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setPublicBalances),
    owner: z.string().min(1),
    balances: z.array(publicBalanceSchema),
  })
  .transform(({ type, owner, balances }) => ({
    type,
    operations: balances.map((balance) => ({
      opType: 'recordSet' as const,
      jsonPath: STELLAR_STATE_PATHS.publicBalances,
      key: ownerAssetKey(owner, balance.asset),
      value: { ...balance, owner },
    })),
  }));
