import type { Disclosure, DisclosurePolicy } from './disclosure.js';

export interface BasePrivacySdkError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: unknown;
}

export interface UnsupportedOperationError extends BasePrivacySdkError {
  code: 'unsupported_operation';
  operation: string;
}

export interface UnsupportedDisclosureError extends BasePrivacySdkError {
  code: 'unsupported_disclosure';
  field: keyof DisclosurePolicy;
  requested: Disclosure;
  supported: Disclosure[];
}

export interface MissingDependencyError extends BasePrivacySdkError {
  code: 'missing_dependency';
  dependency: 'wallet' | 'storage' | 'network' | 'crypto' | 'policy';
}

export interface InvalidIntentError extends BasePrivacySdkError {
  code: 'invalid_intent';
  field: string;
}

export interface InsufficientStateError extends BasePrivacySdkError {
  code: 'insufficient_state';
  reason: string;
}

export interface UserRejectedError extends BasePrivacySdkError {
  code: 'user_rejected';
}

export interface ExecutionError extends BasePrivacySdkError {
  code: 'execution_error';
  stage?: string;
}

export type PrivacySdkError =
  | UnsupportedOperationError
  | UnsupportedDisclosureError
  | MissingDependencyError
  | InvalidIntentError
  | InsufficientStateError
  | UserRejectedError
  | ExecutionError;

export function unsupportedOperationError(
  operation: string,
  message: string,
  details?: unknown,
): UnsupportedOperationError {
  return {
    code: 'unsupported_operation',
    operation,
    message,
    recoverable: false,
    ...(details === undefined ? {} : { details }),
  };
}

export function unsupportedDisclosureError(
  field: keyof DisclosurePolicy,
  requested: Disclosure,
  supported: Disclosure[],
  message: string,
): UnsupportedDisclosureError {
  return {
    code: 'unsupported_disclosure',
    field,
    requested,
    supported,
    message,
    recoverable: true,
  };
}

export function missingDependencyError(
  dependency: MissingDependencyError['dependency'],
  message: string,
): MissingDependencyError {
  return {
    code: 'missing_dependency',
    dependency,
    message,
    recoverable: true,
  };
}

export function invalidIntentError(field: string, message: string): InvalidIntentError {
  return {
    code: 'invalid_intent',
    field,
    message,
    recoverable: true,
  };
}

export function insufficientStateError(
  reason: string,
  message: string,
  details?: unknown,
): InsufficientStateError {
  return {
    code: 'insufficient_state',
    reason,
    message,
    recoverable: true,
    ...(details === undefined ? {} : { details }),
  };
}

export function userRejectedError(message: string): UserRejectedError {
  return {
    code: 'user_rejected',
    message,
    recoverable: true,
  };
}

export function executionError(
  message: string,
  stage?: string,
  details?: unknown,
): ExecutionError {
  return {
    code: 'execution_error',
    message,
    recoverable: false,
    ...(stage === undefined ? {} : { stage }),
    ...(details === undefined ? {} : { details }),
  };
}

export function rejectOperation(errors: PrivacySdkError[]): RejectedOperationShape {
  return { status: 'rejected', errors };
}

export function isPrivacySdkError(error: unknown): error is PrivacySdkError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PrivacySdkError).code === 'string'
  );
}

export interface RejectedOperationShape {
  readonly status: 'rejected';
  readonly errors: PrivacySdkError[];
}
