import {
  PENDING_OPERATION_PHASE,
  RELAY_STATUS,
  type PendingPrivateOperation,
} from './types.js';

const BLOCKED_DIRECT_STATUSES = new Set<string>([
  RELAY_STATUS.submitted,
  RELAY_STATUS.reconciling,
  RELAY_STATUS.rejected,
  RELAY_STATUS.succeeded,
]);

export function canOfferDirectSubmission(operation: PendingPrivateOperation): boolean {
  if (operation.finalized) {
    return false;
  }
  if (operation.relayStatus && BLOCKED_DIRECT_STATUSES.has(operation.relayStatus)) {
    return false;
  }
  if (operation.phase === PENDING_OPERATION_PHASE.rejected) {
    return false;
  }
  if (operation.phase === PENDING_OPERATION_PHASE.failed) {
    return false;
  }
  if (operation.relayRequestId) {
    return false;
  }
  return (
    operation.phase === PENDING_OPERATION_PHASE.prepared ||
    operation.phase === PENDING_OPERATION_PHASE.admissionFailed
  );
}

export function canRetryRelayAttempt(operation: PendingPrivateOperation): boolean {
  if (operation.finalized || !operation.relayRequestId) {
    return false;
  }
  return operation.phase === PENDING_OPERATION_PHASE.failed && operation.retryAllowed;
}
