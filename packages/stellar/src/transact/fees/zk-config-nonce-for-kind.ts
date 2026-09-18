import {
  BINDING_ZK_NONCE,
  SIX_BY_SIX_BINDING_ZK_NONCE,
} from '../environment/zk-config-nonce.js';
import {
  shouldAttachFeeOutput,
  type FeeOutputKindInput,
} from './should-attach-fee-output.js';

export type FeeBearingNonceInput = FeeOutputKindInput & {
  configuredNonce?: bigint;
};

export function configuredNonceSpread(
  zkConfigNonce: bigint | undefined,
): Pick<FeeBearingNonceInput, 'configuredNonce'> {
  if (zkConfigNonce === undefined) {
    return {};
  }
  return { configuredNonce: zkConfigNonce };
}

export function zkConfigNonceForFeeBearingKind(input: FeeBearingNonceInput): bigint {
  if (input.configuredNonce === SIX_BY_SIX_BINDING_ZK_NONCE) {
    return SIX_BY_SIX_BINDING_ZK_NONCE;
  }
  if (input.kind === 'transfer' && shouldAttachFeeOutput(input)) {
    return SIX_BY_SIX_BINDING_ZK_NONCE;
  }
  return input.configuredNonce ?? BINDING_ZK_NONCE;
}
