import { createRejectedOperation } from '@arcane/privacy-sdk-core';
import {
  createStellarPrivacyClientFromResolvedConfig,
  resolveStellarPrivacyClientConfig,
} from './resolve-config.js';
import type { StellarPrivacyClient } from './client.js';
import { createDefaultTransactEngine } from '../transact/engine/default-factory.js';
import type { StellarBrowserPrivacyClientConfig } from '../types.js';

export type CreateStellarPrivacyClientResult =
  StellarPrivacyClient | ReturnType<typeof createRejectedOperation>;

export function isStellarPrivacyClient(
  result: CreateStellarPrivacyClientResult,
): result is StellarPrivacyClient {
  return !('status' in result);
}

export async function createStellarPrivacyClient(
  config: StellarBrowserPrivacyClientConfig,
): Promise<CreateStellarPrivacyClientResult> {
  const resolved = await resolveStellarPrivacyClientConfig(config, async (input) => {
    if (input.transactEngine !== undefined) {
      return input.transactEngine;
    }
    return createDefaultTransactEngine(input.assets, input.transactEnvironment);
  });

  if (!resolved.ok) {
    return resolved.result;
  }

  return createStellarPrivacyClientFromResolvedConfig(resolved.config);
}

export { isPreparedOperation } from '@arcane/privacy-sdk-core';

export type {
  StellarBrowserPrivacyClientConfig,
  StellarPrivacyClientConfig,
} from '../types.js';
