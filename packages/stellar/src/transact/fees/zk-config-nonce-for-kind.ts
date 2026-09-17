import {
  BINDING_ZK_NONCE,
  SIX_BY_SIX_BINDING_ZK_NONCE,
} from '../environment/zk-config-nonce.js';
import {
  shouldAttachFeeOutput,
  type FeeOutputKindInput,
} from './should-attach-fee-output.js';

export function zkConfigNonceForFeeBearingKind(input: FeeOutputKindInput): bigint {
  if (input.kind === 'transfer' && shouldAttachFeeOutput(input)) {
    return SIX_BY_SIX_BINDING_ZK_NONCE;
  }
  return BINDING_ZK_NONCE;
}
