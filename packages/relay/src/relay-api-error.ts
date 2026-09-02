const INFRASTRUCTURE_REASONS = new Set([
  'rate_limited',
  'queue_at_capacity',
  'low_balance',
  'relayer_unavailable',
  'payload_too_large',
]);

export class RelayApiError extends Error {
  readonly reason: string;
  readonly httpStatus: number;

  constructor(input: { reason: string; httpStatus: number }) {
    super(input.reason);
    this.name = 'RelayApiError';
    this.reason = input.reason;
    this.httpStatus = input.httpStatus;
  }
}

export function isInfrastructureRelayFailure(error: RelayApiError): boolean {
  return INFRASTRUCTURE_REASONS.has(error.reason);
}

export function isRelayApiError(error: unknown): error is RelayApiError {
  return error instanceof RelayApiError;
}
