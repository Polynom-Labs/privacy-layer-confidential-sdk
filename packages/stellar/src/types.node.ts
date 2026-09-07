import type { StellarPrivacyClientConfigBase } from './types.js';
import type { StellarTransactEnvironment } from './transact/environment/types.js';

export interface StellarNodeAssets {
  sdkWasmPath: string;
}

export interface StellarNodePrivacyClientConfig extends StellarPrivacyClientConfigBase {
  assets: StellarNodeAssets;
  transactEnvironment?: StellarTransactEnvironment;
}
