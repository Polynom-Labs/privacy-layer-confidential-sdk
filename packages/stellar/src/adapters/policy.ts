import type {
  DepositIntent,
  PolicyAdapter,
  PrivacySdkError,
  WithdrawIntent,
} from '@arcane/privacy-sdk-core';
import { executionError } from '@arcane/privacy-sdk-core';
import { validateStellarDisclosure } from '../policy/disclosure.js';
import type {
  StellarAddress,
  StellarAssetId,
  StellarPolicyAdapter,
  StellarTransferIntent,
} from '../types.js';

type StellarIntent =
  | DepositIntent<StellarAddress, StellarAssetId, bigint>
  | StellarTransferIntent
  | WithdrawIntent<StellarAddress, StellarAssetId, bigint>;

export function createStellarPolicyAdapter(
  policy?: StellarPolicyAdapter,
): PolicyAdapter<StellarAddress, StellarAssetId, bigint> {
  return {
    validateDeposit: async (intent) => [
      ...validateStellarDisclosure('deposit', intent),
      ...(await runExternalPolicy('deposit', intent, policy)),
    ],
    validateTransfer: async (intent) => [
      ...validateStellarDisclosure('transfer', intent),
      ...(await runExternalPolicy('transfer', intent, policy)),
    ],
    validateWithdraw: async (intent) => [
      ...validateStellarDisclosure('withdraw', intent),
      ...(await runExternalPolicy('withdraw', intent, policy)),
    ],
  };
}

async function runExternalPolicy(
  kind: 'deposit' | 'transfer' | 'withdraw',
  intent: StellarIntent,
  policy: StellarPolicyAdapter | undefined,
): Promise<PrivacySdkError[]> {
  if (policy === undefined) {
    return [];
  }

  try {
    await policy.inspectOperation(kind, intent);
    return [];
  } catch (error) {
    return [
      executionError(
        error instanceof Error ? error.message : 'Policy inspection failed.',
        'policyCheck',
      ),
    ];
  }
}
