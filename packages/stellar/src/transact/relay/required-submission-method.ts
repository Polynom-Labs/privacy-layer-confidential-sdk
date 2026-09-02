import type { StellarPreparedOperation } from '../../types.js';
import { RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT } from './constants.js';
import { sliceSupportedPublicSignalFields } from './signals.js';

const ZERO_PUBLIC_DEPOSIT = 0n;

export const SUBMISSION_METHOD = {
  direct: 'direct',
  relay: 'relay',
} as const;

export type SubmissionMethod =
  (typeof SUBMISSION_METHOD)[keyof typeof SUBMISSION_METHOD];

export const ESCROW_SUBMISSION_REFUSAL = {
  positivePublicDeposit: 'escrow_positive_public_deposit',
} as const;

export type EscrowSubmissionRefusal =
  (typeof ESCROW_SUBMISSION_REFUSAL)[keyof typeof ESCROW_SUBMISSION_REFUSAL];

export type RequiredSubmissionMethodResult =
  { method: SubmissionMethod } | { refused: EscrowSubmissionRefusal };

export class EscrowSubmissionRefusedError extends Error {
  readonly reason: EscrowSubmissionRefusal;

  constructor(reason: EscrowSubmissionRefusal) {
    super(reason);
    this.name = 'EscrowSubmissionRefusedError';
    this.reason = reason;
  }
}

export function isEscrowPreparedOperation(prepared: StellarPreparedOperation): boolean {
  return (
    prepared.transactArtifacts?.escrowSend === true ||
    prepared.transactArtifacts?.spendSource === 'escrow'
  );
}

function publicDepositAmountFromPrepared(
  prepared: StellarPreparedOperation,
): bigint | undefined {
  const publicHex = prepared.transactArtifacts?.publicHex;
  if (!publicHex) {
    return undefined;
  }
  const fields = sliceSupportedPublicSignalFields(publicHex);
  const field = fields.find(
    (_unused, offset) => offset === RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT,
  );
  if (!field) {
    throw new Error(
      `Missing packed public signal at index ${String(RELAY_SIGNAL_INDEX_PUBLIC_DEPOSIT)}.`,
    );
  }
  return BigInt(`0x${field.toString('hex')}`);
}

export function evaluateRequiredSubmissionMethod(
  prepared: StellarPreparedOperation,
): RequiredSubmissionMethodResult {
  const publicDepositAmount = publicDepositAmountFromPrepared(prepared);
  if (isEscrowPreparedOperation(prepared)) {
    if (
      publicDepositAmount !== undefined &&
      publicDepositAmount > ZERO_PUBLIC_DEPOSIT
    ) {
      return { refused: ESCROW_SUBMISSION_REFUSAL.positivePublicDeposit };
    }
    return { method: SUBMISSION_METHOD.relay };
  }
  if (publicDepositAmount === undefined) {
    throw new Error('Prepared operation is missing transact artifacts.');
  }
  return {
    method:
      publicDepositAmount > ZERO_PUBLIC_DEPOSIT
        ? SUBMISSION_METHOD.direct
        : SUBMISSION_METHOD.relay,
  };
}

export function requiredSubmissionMethod(
  prepared: StellarPreparedOperation,
): SubmissionMethod {
  const result = evaluateRequiredSubmissionMethod(prepared);
  if ('refused' in result) {
    throw new EscrowSubmissionRefusedError(result.refused);
  }
  return result.method;
}
