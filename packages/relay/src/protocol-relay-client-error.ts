import type { SubmitPrivateOperationResult } from './types.js';
import { PENDING_OPERATION_PHASE } from './types.js';

export class ProtocolRelayClientError extends Error {
  readonly outcome: SubmitPrivateOperationResult['outcome'];
  readonly fallbackAllowed: boolean;
  readonly retryAllowed: boolean;
  readonly operationId: string;
  readonly publicReason?: string;

  constructor(result: SubmitPrivateOperationResult) {
    super(result.operation.publicReason ?? result.outcome);
    this.name = 'ProtocolRelayClientError';
    this.outcome = result.outcome;
    this.fallbackAllowed = result.fallbackAllowed;
    this.retryAllowed = result.retryAllowed;
    this.operationId = result.operation.id;
    if (result.operation.publicReason) {
      this.publicReason = result.operation.publicReason;
    }
  }
}

export function throwIfRelayUnsuccessful(result: SubmitPrivateOperationResult): {
  txId: string;
  coinDeliveryWarning?: string;
} {
  if (result.outcome === PENDING_OPERATION_PHASE.succeeded && result.txId) {
    return {
      txId: result.txId,
      ...(result.coinDeliveryWarning
        ? { coinDeliveryWarning: result.coinDeliveryWarning }
        : {}),
    };
  }
  throw new ProtocolRelayClientError(result);
}
