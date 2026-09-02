import { requireStoredOperation } from './complete-succeeded-operation.js';
import { isUnfinalizedRelayOperation } from './is-unfinalized-relay-operation.js';
import { canRetryRelayAttempt } from './fallback-policy.js';
import { pollPendingOperation } from './poll-pending-operation.js';
import { requireRelayApi } from './relay-config.js';
import {
  PENDING_OPERATION_PHASE,
  RELAY_STATUS,
  type PendingPrivateOperation,
  type ProtocolRelayPorts,
  type SubmitPrivateOperationResult,
} from './types.js';

function withoutPublicReason(
  operation: PendingPrivateOperation,
): PendingPrivateOperation {
  const next = { ...operation };
  delete next.publicReason;
  return next;
}

export async function retryFailedRelayAttempt(input: {
  ports: ProtocolRelayPorts;
  walletPublicKey: string;
  operationId: string;
}): Promise<SubmitPrivateOperationResult> {
  const operation = await requireStoredOperation(input);
  if (!canRetryRelayAttempt(operation) || !operation.relayRequestId) {
    throw new Error('Relay retry is not allowed for this operation.');
  }
  await requireRelayApi(input.ports).retryAttempt(operation.relayRequestId);
  await input.ports.store.save({
    ...withoutPublicReason(operation),
    phase: PENDING_OPERATION_PHASE.relayAccepted,
    relayStatus: RELAY_STATUS.accepted,
    retryAllowed: false,
  });
  return pollPendingOperation(input);
}

export async function resumePendingOperations(input: {
  ports: ProtocolRelayPorts;
  walletPublicKey: string;
}): Promise<SubmitPrivateOperationResult[]> {
  const listed = await input.ports.store.list(input.walletPublicKey);
  const pending = listed.filter((operation) => isUnfinalizedRelayOperation(operation));
  const results: SubmitPrivateOperationResult[] = [];
  for (const operation of pending) {
    results.push(
      await pollPendingOperation({
        ports: input.ports,
        walletPublicKey: input.walletPublicKey,
        operationId: operation.id,
      }),
    );
  }
  return results;
}
