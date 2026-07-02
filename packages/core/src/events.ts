import type { PrivacySdkError } from './errors.js';

export type OperationStage =
  | 'validation'
  | 'stateRead'
  | 'authorization'
  | 'preparation'
  | 'policyCheck'
  | 'submission'
  | 'confirmation'
  | 'storageCommit';

export type OperationEventStatus = 'begin' | 'progress' | 'end' | 'error';

export interface OperationEvent {
  id: string;
  stage: OperationStage;
  status: OperationEventStatus;
  timestamp: number;
  message?: string;
  progress?: {
    current?: number;
    total?: number;
  };
  error?: PrivacySdkError;
  details?: unknown;
}

export interface ExecuteOptions {
  signal?: AbortSignal;
  onEvent?: (event: OperationEvent) => void;
}

export function createOperationEventId(): string {
  return crypto.randomUUID();
}

export function emitOperationEvent(
  options: ExecuteOptions | undefined,
  event: Omit<OperationEvent, 'timestamp'> & { timestamp?: number },
): void {
  options?.onEvent?.({
    ...event,
    timestamp: event.timestamp ?? Date.now(),
  });
}

export function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }
}
