import type { ExecuteOptions } from './events.js';
import { executionError, type PrivacySdkError } from './errors.js';
import type { IntentForKind, OperationKind } from './intents.js';

export interface PreparedOperation<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TPrepared,
  TReceipt,
> {
  readonly status: 'prepared';
  readonly kind: TKind;
  readonly intent: IntentForKind<TKind, TAddress, TAsset, TAmount>;
  readonly prepared: TPrepared;
  execute(options?: ExecuteOptions): Promise<TReceipt>;
}

export interface RejectedOperation {
  readonly status: 'rejected';
  readonly errors: PrivacySdkError[];
}

export type OperationResult<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TPrepared,
  TReceipt,
> =
  | PreparedOperation<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt>
  | RejectedOperation;

export function isPreparedOperation<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TPrepared,
  TReceipt,
>(
  result: OperationResult<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt>,
): result is PreparedOperation<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt> {
  return result.status === 'prepared';
}

export function createPreparedOperation<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TPrepared,
  TReceipt,
>(
  kind: TKind,
  intent: IntentForKind<TKind, TAddress, TAsset, TAmount>,
  prepared: TPrepared,
  executeFn: (options?: ExecuteOptions) => Promise<TReceipt>,
): PreparedOperation<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt> {
  let executionStarted = false;

  return {
    status: 'prepared',
    kind,
    intent,
    prepared,
    execute: async (options) => {
      if (executionStarted) {
        throw executionError('Prepared operation was already executed.', 'submission');
      }
      executionStarted = true;
      return executeFn(options);
    },
  };
}

export function createRejectedOperation(errors: PrivacySdkError[]): RejectedOperation {
  return { status: 'rejected', errors };
}
