import { pollPendingOperation } from './poll-pending-operation.js';
import { isTerminalRelayStatus } from './poll-pending-operation.js';
import { submitPreparedPrivateOperation } from './submit-prepared-private-operation.js';
import {
  PENDING_OPERATION_PHASE,
  type NewPrivateOperation,
  type ProtocolRelayPorts,
  type SubmitPrivateOperationResult,
} from './types.js';

const DEFAULT_POLL_INTERVAL_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isSettled(result: SubmitPrivateOperationResult): boolean {
  return (
    result.outcome === PENDING_OPERATION_PHASE.succeeded ||
    result.outcome === PENDING_OPERATION_PHASE.rejected ||
    result.outcome === PENDING_OPERATION_PHASE.failed ||
    result.outcome === PENDING_OPERATION_PHASE.admissionFailed ||
    isTerminalRelayStatus(result.operation.relayStatus)
  );
}

export async function awaitRelaySettlement(input: {
  ports: ProtocolRelayPorts;
  walletPublicKey: string;
  operationId: string;
  pollIntervalMs?: number;
}): Promise<SubmitPrivateOperationResult> {
  let result = await pollPendingOperation(input);
  while (!isSettled(result)) {
    await delay(input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
    result = await pollPendingOperation(input);
  }
  return result;
}

export async function submitAndAwaitPrivateOperation(input: {
  ports: ProtocolRelayPorts;
  operation: NewPrivateOperation;
  pollIntervalMs?: number;
}): Promise<SubmitPrivateOperationResult> {
  const submitted = await submitPreparedPrivateOperation(input);
  if (submitted.outcome !== PENDING_OPERATION_PHASE.relayAccepted) {
    return submitted;
  }
  return awaitRelaySettlement({
    ports: input.ports,
    walletPublicKey: input.operation.walletPublicKey,
    operationId: input.operation.id,
    ...(input.pollIntervalMs === undefined
      ? {}
      : { pollIntervalMs: input.pollIntervalMs }),
  });
}
