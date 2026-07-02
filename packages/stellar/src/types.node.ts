import type { StellarPrivacyClientConfigBase } from './types.js';

export interface StellarNodeAssets {
  sdkWasmPath: string;
  circuitWasmPath: string;
  provingKeyPath: string;
}

export interface StellarNodePrivacyClientConfig extends StellarPrivacyClientConfigBase {
  assets: StellarNodeAssets;
}
