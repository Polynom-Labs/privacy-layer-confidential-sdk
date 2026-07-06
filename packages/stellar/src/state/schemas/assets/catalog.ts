import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { assetSchema } from '../shared.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export const readAssetsCatalogSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readAssetsCatalog),
  })
  .transform(({ type }) => ({
    type,
    operations: [
      {
        opType: 'primitiveGet' as const,
        jsonPath: STELLAR_STATE_PATHS.assets,
      },
    ],
  }));

export const readAssetSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readAsset),
    assetId: z.string().min(1),
  })
  .transform(({ type, assetId }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.assetsById,
        key: assetId,
      },
    ],
  }));

export const replaceAssetsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.replaceAssets),
    assets: z.array(assetSchema),
  })
  .transform(({ type, assets }) => {
    const byId: Record<string, unknown> = {};
    const listOrder: string[] = [];
    for (const asset of assets) {
      Reflect.set(byId, asset.assetId, withoutUndefinedFields(asset));
      listOrder.push(asset.assetId);
    }
    return {
      type,
      operations: [
        {
          opType: 'primitiveSet' as const,
          jsonPath: STELLAR_STATE_PATHS.assets,
          value: { byId, listOrder },
        },
      ],
    };
  });

export const upsertAssetsSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.upsertAssets),
    assets: z.array(assetSchema),
  })
  .transform(({ type, assets }) => ({
    type,
    operations: assets.map((asset) => ({
      opType: 'recordSet' as const,
      jsonPath: STELLAR_STATE_PATHS.assetsById,
      key: asset.assetId,
      value: asset,
    })),
  }));
