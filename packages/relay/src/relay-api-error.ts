import { RELAY_INFRASTRUCTURE_HTTP_REASONS } from './reasons.js';

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
  return RELAY_INFRASTRUCTURE_HTTP_REASONS.has(error.reason);
}

export function isRelayApiError(error: unknown): error is RelayApiError {
  return error instanceof RelayApiError;
}
