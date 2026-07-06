import type {
  StellarAsset,
  StellarAssetId,
  StellarAssetsCatalog,
} from '../../../types.js';
import { readRecordValue } from '../../foundation/keys.js';
import { normalizeAsset, normalizeAssetsCatalog } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';
import { createAssetsUpsertMethods } from './upsert-methods.js';

export function createAssetsCatalogMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  async function getAssetsCatalog(): Promise<StellarAssetsCatalog> {
    const value = await bridge.read<unknown>({
      type: stellarStateCallTypes.readAssetsCatalog,
    });
    return normalizeAssetsCatalog(value);
  }

  function replaceAssets(assets: StellarAsset[]): Promise<void> {
    return bridge.write({
      type: stellarStateCallTypes.replaceAssets,
      assets,
    });
  }

  const coreMethods = {
    getAssetsCatalog,

    async getAsset(assetId: StellarAssetId): Promise<StellarAsset | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readAsset,
        assetId,
      });
      return normalizeAsset(value);
    },

    async getAssets(): Promise<StellarAsset[]> {
      const catalog = await getAssetsCatalog();
      return catalog.listOrder
        .map((assetId) => readRecordValue(catalog.byId, assetId))
        .filter((asset): asset is StellarAsset => asset !== undefined);
    },

    async getAssetsForPool(poolContract: string): Promise<StellarAsset[]> {
      const assets = await coreMethods.getAssets();
      return assets.filter((asset) => asset.poolContracts.includes(poolContract));
    },

    replaceAssets,
  };

  return {
    ...coreMethods,
    ...createAssetsUpsertMethods(context, {
      getAssetsCatalog,
      replaceAssets,
    }),
  };
}
