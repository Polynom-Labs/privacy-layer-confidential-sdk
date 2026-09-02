import {
  PENDING_OPERATION_PHASE,
  type PendingPrivateOperation,
  type ProtocolRelayPorts,
  type SubmitPrivateOperationResult,
} from './types.js';
import { canOfferDirectSubmission, canRetryRelayAttempt } from './fallback-policy.js';

const inFlightCompletions = new Map<string, Promise<SubmitPrivateOperationResult>>();

export function toSubmitResult(
  operation: PendingPrivateOperation,
  extras?: {
    txId?: string;
    coinDeliveryWarning?: string;
  },
): SubmitPrivateOperationResult {
  const result: SubmitPrivateOperationResult = {
    outcome: operation.phase,
    operation,
    fallbackAllowed: canOfferDirectSubmission(operation),
    retryAllowed: canRetryRelayAttempt(operation),
  };
  if (extras?.txId) {
    result.txId = extras.txId;
  }
  if (extras?.coinDeliveryWarning) {
    result.coinDeliveryWarning = extras.coinDeliveryWarning;
  }
  return result;
}

export async function requireStoredOperation(input: {
  ports: ProtocolRelayPorts;
  walletPublicKey: string;
  operationId: string;
}): Promise<PendingPrivateOperation> {
  const operation = await input.ports.store.read({
    walletPublicKey: input.walletPublicKey,
    operationId: input.operationId,
  });
  if (!operation) {
    throw new Error('Pending private operation was not found.');
  }
  return operation;
}

function successKey(operation: PendingPrivateOperation, txId: string): string {
  return `${operation.walletPublicKey}:${operation.id}:${txId}`;
}

function withSucceededPhase(
  operation: PendingPrivateOperation,
  txId: string,
): PendingPrivateOperation {
  return {
    ...operation,
    phase: PENDING_OPERATION_PHASE.succeeded,
    relayStatus: 'succeeded',
    transactionHash: txId,
    retryAllowed: false,
  };
}

function isAlreadyCompleted(operation: PendingPrivateOperation): boolean {
  return (
    operation.finalized && operation.deliveriesDrained && operation.transactionPersisted
  );
}

async function applySuccessSideEffects(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
  txId: string;
}): Promise<{ operation: PendingPrivateOperation; warning?: string }> {
  let current = input.operation;
  let warning: string | undefined;
  if (!current.finalized) {
    await input.ports.finalizeLocalState({
      operation: current,
      txId: input.txId,
    });
    current = { ...current, finalized: true };
    await input.ports.store.save(current);
  }
  if (!current.deliveriesDrained) {
    warning = await input.ports.drainDeliveries({
      operation: current,
      txId: input.txId,
    });
    current = { ...current, deliveriesDrained: true };
    await input.ports.store.save(current);
  }
  if (!current.transactionPersisted) {
    input.ports.persistUserTransaction({
      operation: current,
      txId: input.txId,
    });
    current = { ...current, transactionPersisted: true };
    await input.ports.store.save(current);
  }
  return warning === undefined
    ? { operation: current }
    : { operation: current, warning };
}

async function applySucceededCompletion(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
  txId: string;
}): Promise<SubmitPrivateOperationResult> {
  const applied = await applySuccessSideEffects(input);
  await input.ports.store.save(applied.operation);
  return toSubmitResult(applied.operation, {
    txId: input.txId,
    ...(applied.warning ? { coinDeliveryWarning: applied.warning } : {}),
  });
}

export async function completeSucceededOperation(input: {
  ports: ProtocolRelayPorts;
  operation: PendingPrivateOperation;
  txId: string;
}): Promise<SubmitPrivateOperationResult> {
  const stored = await input.ports.store.read({
    walletPublicKey: input.operation.walletPublicKey,
    operationId: input.operation.id,
  });
  const succeeded = withSucceededPhase(stored ?? input.operation, input.txId);
  const key = successKey(succeeded, input.txId);
  if (isAlreadyCompleted(succeeded)) {
    await input.ports.store.save(succeeded);
    return toSubmitResult(succeeded, { txId: input.txId });
  }
  const existing = inFlightCompletions.get(key);
  if (existing) {
    return existing;
  }
  const completion = applySucceededCompletion({
    ports: input.ports,
    operation: succeeded,
    txId: input.txId,
  });
  inFlightCompletions.set(key, completion);
  try {
    return await completion;
  } finally {
    inFlightCompletions.delete(key);
  }
}
