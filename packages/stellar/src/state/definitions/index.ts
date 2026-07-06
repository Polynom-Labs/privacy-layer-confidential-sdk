import type { StateBridgeDefinition } from '@arcane/privacy-sdk-core/state';
import { registerStellarArrayFilterSchemas } from '../filters/register-schemas.js';
import { stellarAssetsStateDefinitions } from './assets.js';
import { stellarBalancesStateDefinitions } from './balances.js';
import { stellarClaimsStateDefinitions } from './claims.js';
import { stellarDeliveriesStateDefinitions } from './deliveries.js';
import { stellarPoolStateDefinitions } from './pool.js';
import { stellarRecordsStateDefinitions } from './records.js';
import { stellarRegistryStateDefinitions } from './registry.js';
import { stellarTransactionStateDefinitions } from './transactions.js';
import { stellarWalletStateDefinitions } from './wallet.js';

registerStellarArrayFilterSchemas();

export const stellarStateDefinitions: StateBridgeDefinition[] = [
  ...stellarClaimsStateDefinitions,
  ...stellarRegistryStateDefinitions,
  ...stellarAssetsStateDefinitions,
  ...stellarBalancesStateDefinitions,
  ...stellarPoolStateDefinitions,
  ...stellarRecordsStateDefinitions,
  ...stellarDeliveriesStateDefinitions,
  ...stellarWalletStateDefinitions,
  ...stellarTransactionStateDefinitions,
];
