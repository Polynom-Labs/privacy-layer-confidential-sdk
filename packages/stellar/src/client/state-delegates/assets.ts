import type { StellarStateService } from '../../state/index.js';

export function createAssetsStateDelegates(state: StellarStateService) {
  return {
    getAssets: () => state.getAssets(),
    getAssetsCatalog: () => state.getAssetsCatalog(),
    getAsset: (assetId: Parameters<StellarStateService['getAsset']>[0]) =>
      state.getAsset(assetId),
    getAssetsForPool: (poolContract: string) => state.getAssetsForPool(poolContract),
    replaceAssets: (assets: Parameters<StellarStateService['replaceAssets']>[0]) =>
      state.replaceAssets(assets),
    upsertAssets: (assets: Parameters<StellarStateService['upsertAssets']>[0]) =>
      state.upsertAssets(assets),
    getPublicBalance: (input: Parameters<StellarStateService['getPublicBalance']>[0]) =>
      state.getPublicBalance(input),
    getPublicBalances: (
      owner: Parameters<StellarStateService['getPublicBalances']>[0],
    ) => state.getPublicBalances(owner),
    setPublicBalance: (
      balance: Parameters<StellarStateService['setPublicBalance']>[0],
    ) => state.setPublicBalance(balance),
    setPublicBalances: (
      input: Parameters<StellarStateService['setPublicBalances']>[0],
    ) => state.setPublicBalances(input),
  };
}
