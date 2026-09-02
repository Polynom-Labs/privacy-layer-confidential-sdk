import {
  SUBMISSION_PATH,
  type NewPrivateOperation,
  type SubmissionPath,
} from './types.js';

const ZERO_PUBLIC_DEPOSIT = 0n;

export function chooseSubmissionPath(
  publicDepositAmount: string,
  kind?: NewPrivateOperation['display']['kind'],
): SubmissionPath {
  if (kind === 'pending_claim') {
    return SUBMISSION_PATH.direct;
  }
  return BigInt(publicDepositAmount) > ZERO_PUBLIC_DEPOSIT
    ? SUBMISSION_PATH.direct
    : SUBMISSION_PATH.relay;
}
