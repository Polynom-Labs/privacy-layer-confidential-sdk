import {
  completeSucceededOperation,
  requireStoredOperation,
  toSubmitResult,
} from './complete-succeeded-operation.js';
import {
  PENDING_OPERATION_PHASE,
  RELAY_STATUS,
  type PendingPrivateOperation,
  type ProtocolRelayPorts,
  type RelayLifecycleStatus,
  type RelayRequestStatus,
  type SubmitPrivateOperationResult,
} from './types.js';

const TERMINAL_STATUSES = new Set<string>([
  RELAY_STATUS.succeeded,
  RELAY_STATUS.rejected,
  RELAY_STATUS.failed,
]);

function isRelayStatus(value: string): value is RelayLifecycleStatus {
  return Object.values(RELAY_STATUS).includes(value as RelayLifecycleStatus);
}

function applyStatus(
  operation: PendingPrivateOperation,
  status: RelayRequestStatus,
): PendingPrivateOperation {
  const next: PendingPrivateOperation = {
    ...operation,
    retryAllowed: status.retryAllowed,
  };
  if (isRelayStatus(status.status)) {
    next.relayStatus = status.status;
  }
  if (status.publicReason) {
    next.publicReason = status.publicReason;
  }
  if (status.transactionHash) {
    next.transactionHash = status.transactionHash;
  }
  if (status.status === RELAY_STATUS.rejected) {
    next.phase = PENDING_OPERATION_PHASE.rejected;
    next.retryAllowed = false;
  }
  if (status.status === RELAY_STATUS.failed) {
    next.phase = PENDING_OPERATION_PHASE.failed;
  }
  return next;
}

export async function pollPendingOperation(input: {
  ports: ProtocolRelayPorts;
  walletPublicKey: string;
  operationId: string;
}): Promise<SubmitPrivateOperationResult> {
  const operation = await requireStoredOperation(input);
  if (!operation.relayRequestId) {
    return toSubmitResult(operation);
  }
  const status = await input.ports.relayApi.readStatus(operation.relayRequestId);
  const updated = applyStatus(operation, status);
  await input.ports.store.save(updated);
  if (status.status === RELAY_STATUS.succeeded && status.transactionHash) {
    return completeSucceededOperation({
      ports: input.ports,
      operation: updated,
      txId: status.transactionHash,
    });
  }
  return toSubmitResult(updated, {
    ...(updated.transactionHash ? { txId: updated.transactionHash } : {}),
  });
}

export function isTerminalRelayStatus(status: string | undefined): boolean {
  return Boolean(status && TERMINAL_STATUSES.has(status));
}
