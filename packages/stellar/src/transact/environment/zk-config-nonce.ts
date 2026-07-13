import type { StellarTransactEnvironment } from './types.js';

const DEFAULT_ZK_CONFIG_NONCE = 0n;

export function resolveZkConfigNonce(
  transactEnvironment: StellarTransactEnvironment,
): bigint {
  return transactEnvironment.zkConfigNonce ?? DEFAULT_ZK_CONFIG_NONCE;
}
