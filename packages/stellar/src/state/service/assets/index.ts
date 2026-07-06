import type { StellarStateServiceBase } from '../base.js';
import { createPublicBalanceMethods } from './balance-methods.js';
import { createAssetsCatalogMethods } from './catalog-methods.js';

export function createAssetsService(context: StellarStateServiceBase) {
  return {
    ...createAssetsCatalogMethods(context),
    ...createPublicBalanceMethods(context),
  };
}
