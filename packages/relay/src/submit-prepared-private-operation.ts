import { completeSucceededOperation } from './complete-succeeded-operation.js';
import { chooseSubmissionPath } from './choose-submission-path.js';
import { toSubmitResult } from './complete-succeeded-operation.js';
import {
  PENDING_OPERATION_PHASE,
  RELAY_STATUS,
  SUBMISSION_PATH,
  type NewPrivateOperation,
  type PendingPrivateOperation,
  type ProtocolRelayPorts,
  type SubmitPrivateOperationResult,
} from './types.js';
import { RelayApiError, isInfrastructureRelayFailure } from './relay-api-error.js';
import { RELAY_PUBLIC_REASON } from './reasons.js';

function buildPreparedOperation(input: NewPrivateOperation): PendingPrivateOperation {
  return {
    id: input.id,
    walletPublicKey: input.walletPublicKey,
    phase: PENDING_OPERATION_PHASE.prepared,
    retryAllowed: false,
    display: input.display,
    snapshot: input.snapshot,
    deliveryOutbox: input.deliveryOutbox,
    relayPackage: input.relayPackage,
    finalized: false,
    deliveriesDrained: false,
    transactionPersisted: false,
  };
}

async function submitDirectPath(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
}): Promise<SubmitPrivateOperationResult> {
  const receipt = await input.ports.submitDirect(input.operation);
  return completeSucceededOperation({
    ports: input.ports,
    operation: input.operation,
    txId: receipt.txId,
  });
}

async function saveAdmissionFailure(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
  reason: string;
}): Promise<SubmitPrivateOperationResult> {
  const failed: PendingPrivateOperation = {
    ...input.operation,
    phase: PENDING_OPERATION_PHASE.admissionFailed,
    publicReason: input.reason,
    retryAllowed: false,
  };
  await input.ports.store.save(failed);
  return toSubmitResult(failed);
}

async function saveRejectedWithoutRequest(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
  reason: string;
}): Promise<SubmitPrivateOperationResult> {
  const rejected: PendingPrivateOperation = {
    ...input.operation,
    phase: PENDING_OPERATION_PHASE.rejected,
    publicReason: input.reason,
    retryAllowed: false,
  };
  await input.ports.store.save(rejected);
  return toSubmitResult(rejected);
}

async function createRelayRequest(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
}): Promise<SubmitPrivateOperationResult> {
  await input.ports.store.save(input.operation);
  try {
    const accepted = await input.ports.relayApi.createRequest(
      input.operation.relayPackage,
    );
    const stored: PendingPrivateOperation = {
      ...input.operation,
      phase: PENDING_OPERATION_PHASE.relayAccepted,
      relayRequestId: accepted.relayRequestId,
      relayStatus: RELAY_STATUS.accepted,
      retryAllowed: false,
    };
    await input.ports.store.save(stored);
    return toSubmitResult(stored);
  } catch (error: unknown) {
    const reason =
      error instanceof RelayApiError
        ? error.reason
        : RELAY_PUBLIC_REASON.infrastructureFailed;
    if (error instanceof RelayApiError && !isInfrastructureRelayFailure(error)) {
      return saveRejectedWithoutRequest({
        ports: input.ports,
        operation: input.operation,
        reason,
      });
    }
    return saveAdmissionFailure({
      ports: input.ports,
      operation: input.operation,
      reason,
    });
  }
}

export async function submitPreparedPrivateOperation(input: {
  ports: ProtocolRelayPorts;
  operation: NewPrivateOperation;
}): Promise<SubmitPrivateOperationResult> {
  const prepared = buildPreparedOperation(input.operation);
  if (
    chooseSubmissionPath(
      input.operation.publicDepositAmount,
      input.operation.display.kind,
    ) === SUBMISSION_PATH.direct
  ) {
    return submitDirectPath({
      ports: input.ports,
      operation: prepared,
    });
  }
  return createRelayRequest({
    ports: input.ports,
    operation: prepared,
  });
}
