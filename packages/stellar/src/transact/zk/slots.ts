import {
  padDepositSlots,
  padPublicLegs,
  padWithdrawSlots,
  type DepositSlot,
  type PrivacyPoolSDK,
  type WithdrawSlot,
} from '@auditable/privacy-pool-zk-sdk';
import type { TransactionPublicLegParameters } from '../proofs/transaction-input.js';

export function padWithdrawSlotsToLayout(
  sdk: PrivacyPoolSDK,
  slots: WithdrawSlot[],
): WithdrawSlot[] {
  return padWithdrawSlots(slots, sdk.getLayout().nIns);
}

export function padDepositSlotsToLayout(
  sdk: PrivacyPoolSDK,
  slots: DepositSlot[],
): DepositSlot[] {
  return padDepositSlots(slots, sdk.getLayout().nOuts);
}

export function padPublicLegsToLayout(
  sdk: PrivacyPoolSDK,
  legs: TransactionPublicLegParameters,
): TransactionPublicLegParameters {
  const { publicNInputs, publicNOutputs } = sdk.getLayout();
  return padPublicLegs(legs, publicNInputs, publicNOutputs);
}

function padStrings(values: string[], length: number, fill: string): string[] {
  if (values.length > length) {
    throw new Error(
      `expected at most ${String(length)} application-id slots, got ${String(values.length)}`,
    );
  }
  return [...values, ...Array.from({ length: length - values.length }, () => fill)];
}

export function buildApplicationIdHints(input: {
  sdk: PrivacyPoolSDK;
  inputIds: string[];
  outputIds: string[];
}): string[] {
  const { nIns, nOuts } = input.sdk.getLayout();
  return [
    ...padStrings(input.inputIds, nIns, '0'),
    ...padStrings(input.outputIds, nOuts, '0'),
  ];
}

export function uniformApplicationIdHints(
  applicationId: string,
  nAuditSlots: number,
): string[] {
  return Array.from({ length: nAuditSlots }, () => applicationId);
}
