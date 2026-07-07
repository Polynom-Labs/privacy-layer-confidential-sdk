import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  readAssetsCatalogSchema,
  readAssetSchema,
  replaceAssetsSchema,
  upsertAssetsSchema,
} from '../schemas/assets/catalog.js';

export const stellarAssetsStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.readAssetsCatalog,
    mode: 'read',
    schema: readAssetsCatalogSchema,
  },
  {
    type: stellarStateCallTypes.readAsset,
    mode: 'read',
    schema: readAssetSchema,
  },
  {
    type: stellarStateCallTypes.replaceAssets,
    mode: 'write',
    schema: replaceAssetsSchema,
  },
  {
    type: stellarStateCallTypes.upsertAssets,
    mode: 'write',
    schema: upsertAssetsSchema,
  },
];
