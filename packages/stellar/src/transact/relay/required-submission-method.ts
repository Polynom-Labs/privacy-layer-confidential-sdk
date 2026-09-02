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

function publicDepositAmountFromPrepared(prepared: StellarPreparedOperation): bigint {
  const publicHex = prepared.transactArtifacts?.publicHex;
  if (!publicHex) {
    throw new Error('Prepared operation is missing transact artifacts.');
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

export function requiredSubmissionMethod(
  prepared: StellarPreparedOperation,
): SubmissionMethod {
  if (prepared.transactArtifacts?.spendSource === 'pendingClaim') {
    return SUBMISSION_METHOD.direct;
  }
  return publicDepositAmountFromPrepared(prepared) > ZERO_PUBLIC_DEPOSIT
    ? SUBMISSION_METHOD.direct
    : SUBMISSION_METHOD.relay;
}
