export const RELAY_PUBLIC_REASON = {
  invalidPackage: 'invalid_package',
  unsupportedSignalShape: 'unsupported_signal_shape',
  positivePublicDeposit: 'positive_public_deposit',
  zkConfigMissing: 'zk_config_missing',
  zkConfigDeprecated: 'zk_config_deprecated',
  zkConfigIncompatible: 'zk_config_incompatible',
  invalidProof: 'invalid_proof',
  kytRejected: 'kyt_rejected',
  kytAuthorizationMismatch: 'kyt_authorization_mismatch',
  escrowRelayUnconfigured: 'escrow_relay_unconfigured',
  nullifiersSpent: 'nullifiers_spent',
  simulationFailed: 'simulation_failed',
  resourceFeeExceeded: 'resource_fee_exceeded',
  resourceLimitExceeded: 'resource_limit_exceeded',
  sendFailed: 'send_failed',
  transactionFailed: 'transaction_failed',
  infrastructureFailed: 'infrastructure_failed',
} as const;

export type RelayPublicReason =
  (typeof RELAY_PUBLIC_REASON)[keyof typeof RELAY_PUBLIC_REASON];

export const RELAY_HTTP_REASON = {
  payloadTooLarge: 'payload_too_large',
  rateLimited: 'rate_limited',
  unsupportedPool: 'unsupported_pool',
  queueAtCapacity: 'queue_at_capacity',
  lowBalance: 'low_balance',
  conflictingPayload: 'conflicting_payload',
  retryNotAllowed: 'retry_not_allowed',
  notFound: 'not_found',
  relayerUnavailable: 'relayer_unavailable',
  invalidPackage: 'invalid_package',
  unsupportedSignalShape: 'unsupported_signal_shape',
} as const;

export type RelayHttpReason =
  (typeof RELAY_HTTP_REASON)[keyof typeof RELAY_HTTP_REASON];

const REJECTION_REASONS: ReadonlySet<string> = new Set([
  RELAY_PUBLIC_REASON.invalidPackage,
  RELAY_PUBLIC_REASON.unsupportedSignalShape,
  RELAY_PUBLIC_REASON.positivePublicDeposit,
  RELAY_PUBLIC_REASON.zkConfigMissing,
  RELAY_PUBLIC_REASON.zkConfigDeprecated,
  RELAY_PUBLIC_REASON.zkConfigIncompatible,
  RELAY_PUBLIC_REASON.invalidProof,
  RELAY_PUBLIC_REASON.kytRejected,
  RELAY_PUBLIC_REASON.kytAuthorizationMismatch,
  RELAY_PUBLIC_REASON.escrowRelayUnconfigured,
  RELAY_PUBLIC_REASON.nullifiersSpent,
  RELAY_PUBLIC_REASON.simulationFailed,
  RELAY_PUBLIC_REASON.resourceFeeExceeded,
  RELAY_PUBLIC_REASON.resourceLimitExceeded,
]);

const RETRYABLE_FAILURE_REASONS: ReadonlySet<string> = new Set([
  RELAY_PUBLIC_REASON.sendFailed,
  RELAY_PUBLIC_REASON.transactionFailed,
  RELAY_PUBLIC_REASON.infrastructureFailed,
]);

export const RELAY_INFRASTRUCTURE_HTTP_REASONS: ReadonlySet<string> = new Set([
  RELAY_HTTP_REASON.rateLimited,
  RELAY_HTTP_REASON.queueAtCapacity,
  RELAY_HTTP_REASON.lowBalance,
  RELAY_HTTP_REASON.relayerUnavailable,
  RELAY_HTTP_REASON.payloadTooLarge,
]);

export function isRetryableFailureReason(reason: string | null | undefined): boolean {
  if (!reason) {
    return false;
  }
  return RETRYABLE_FAILURE_REASONS.has(reason);
}

export function isRejectionReason(reason: string): boolean {
  return REJECTION_REASONS.has(reason);
}
