import { createRejectedOperation } from '@arcane/privacy-sdk-core';
import { loadNodeAssets } from './load-node-assets.js';
import {
  createStellarPrivacyClientFromResolvedConfig,
  resolveStellarPrivacyClientConfig,
} from './stellar-privacy-client.js';
import { createDefaultTransactEngine } from './transact-engine.browser.js';
import type { StellarNodePrivacyClientConfig } from './types.node.js';

export type { CreateStellarPrivacyClientResult } from './create-stellar-privacy-client.js';
export {
  createStellarPrivacyClient,
  isPreparedOperation,
  isStellarPrivacyClient,
} from './create-stellar-privacy-client.js';
export type {
  StellarBrowserPrivacyClientConfig,
  StellarPrivacyClientConfig,
} from './create-stellar-privacy-client.js';

export type {
  StellarNodeAssets,
  StellarNodePrivacyClientConfig,
} from './types.node.js';

export async function createStellarPrivacyClientFromNodeConfig(
  config: StellarNodePrivacyClientConfig,
): Promise<
  | ReturnType<typeof createStellarPrivacyClientFromResolvedConfig>
  | ReturnType<typeof createRejectedOperation>
> {
  const resolved = await resolveStellarPrivacyClientConfig(config, async (input) => {
    if (input.transactEngine !== undefined) {
      return input.transactEngine;
    }
    const browserAssets = await loadNodeAssets(input.assets);
    return createDefaultTransactEngine(browserAssets);
  });

  if (!resolved.ok) {
    return resolved.result;
  }

  return createStellarPrivacyClientFromResolvedConfig(resolved.config);
}
