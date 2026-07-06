import { createRejectedOperation } from '@arcane/privacy-sdk-core';
import type { StellarTransactEnvironment } from '../transact/environment/types.js';
import type {
  ResolvedStellarPrivacyClientConfig,
  StellarPrivacyClientConfigBase,
  StellarTransactEngine,
} from '../types.js';
import { validateStellarConfig } from './validate-config.js';
import {
  createStellarPrivacyClientInstance,
  type StellarPrivacyClient,
} from './client.js';
import { resolveClientTransactEnvironment } from './resolve-transact-environment.js';

export async function resolveStellarPrivacyClientConfig<
  TConfig extends StellarPrivacyClientConfigBase,
>(
  config: TConfig,
  createEngine: (config: TConfig) => Promise<StellarTransactEngine>,
): Promise<
  | { ok: true; config: ResolvedStellarPrivacyClientConfig & TConfig }
  | { ok: false; result: ReturnType<typeof createRejectedOperation> }
> {
  const errors = validateStellarConfig(config);
  if (errors.length > 0) {
    return { ok: false, result: createRejectedOperation(errors) };
  }

  const browserConfig = config as {
    transactEnvironment?: StellarTransactEnvironment;
    auditPublicKeyHex?: string;
  };
  const sourceTransactEnvironment = browserConfig.transactEnvironment;
  const auditPublicKeyHex = browserConfig.auditPublicKeyHex;
  const transactEnvironment = resolveClientTransactEnvironment({
    ...(sourceTransactEnvironment ? { sourceTransactEnvironment } : {}),
    ...(auditPublicKeyHex ? { auditPublicKeyHex } : {}),
    state: config.state,
  });
  const engineConfig =
    transactEnvironment === undefined
      ? config
      : ({ ...config, transactEnvironment } as TConfig);

  const transactEngine = config.transactEngine ?? (await createEngine(engineConfig));

  const resolvedConfig: ResolvedStellarPrivacyClientConfig & TConfig = {
    ...config,
    transactEngine,
    ...(transactEnvironment === undefined ? {} : { transactEnvironment }),
  };

  return {
    ok: true,
    config: resolvedConfig,
  };
}

export function createStellarPrivacyClientFromResolvedConfig(
  config: ResolvedStellarPrivacyClientConfig,
): StellarPrivacyClient {
  return createStellarPrivacyClientInstance(config);
}

export type { ResolvedStellarPrivacyClientConfig } from '../types.js';
