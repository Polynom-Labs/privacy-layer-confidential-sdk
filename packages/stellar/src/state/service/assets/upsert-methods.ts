import type { StellarAsset } from '../../../types.js';
import { readRecordValue } from '../../foundation/keys.js';
import type { StellarStateServiceBase } from '../base.js';

type AssetsCatalogDeps = {
  getAssetsCatalog: () => Promise<{
    byId: Record<string, StellarAsset>;
    listOrder: string[];
  }>;
  replaceAssets: (assets: StellarAsset[]) => Promise<void>;
};

export function createAssetsUpsertMethods(
  _context: StellarStateServiceBase,
  deps: AssetsCatalogDeps,
) {
  return {
    async upsertAssets(assets: StellarAsset[]): Promise<void> {
      if (assets.length === 0) {
        return;
      }
      const catalog = await deps.getAssetsCatalog();
      const byId = { ...catalog.byId };
      const listOrder = [...catalog.listOrder];
      for (const asset of assets) {
        byId[asset.assetId] = asset;
        if (!listOrder.includes(asset.assetId)) {
          listOrder.push(asset.assetId);
        }
      }
      const merged = listOrder
        .map((assetId) => readRecordValue(byId, assetId))
        .filter((asset): asset is StellarAsset => asset !== undefined);
      await deps.replaceAssets(merged);
    },
  };
}
