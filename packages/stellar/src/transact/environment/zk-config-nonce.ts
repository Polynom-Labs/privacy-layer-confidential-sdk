import type { StellarTransactEnvironment } from './types.js';

export const STANDARD_ZK_CONFIG_NONCE = 0n;
export const COMMITMENT_V2_ZK_NONCE = 2n;
export const DEFAULT_ZK_CONFIG_NONCE = COMMITMENT_V2_ZK_NONCE;

export function resolveZkConfigNonce(
  transactEnvironment: StellarTransactEnvironment,
): bigint {
  return transactEnvironment.zkConfigNonce ?? DEFAULT_ZK_CONFIG_NONCE;
}
