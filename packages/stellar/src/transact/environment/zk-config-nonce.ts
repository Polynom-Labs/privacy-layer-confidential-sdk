import type { StellarTransactEnvironment } from './types.js';

export const STANDARD_ZK_CONFIG_NONCE = 0n;
export const COMMITMENT_V2_ZK_NONCE = 2n;
export const BINDING_ZK_NONCE = 3n;
export const SIX_BY_SIX_ZK_NONCE = 6n;
export const SIX_BY_SIX_BINDING_ZK_NONCE = 7n;
export const DEFAULT_ZK_CONFIG_NONCE = BINDING_ZK_NONCE;

export function resolveZkConfigNonce(
  transactEnvironment: StellarTransactEnvironment,
): bigint {
  return transactEnvironment.zkConfigNonce ?? DEFAULT_ZK_CONFIG_NONCE;
}
