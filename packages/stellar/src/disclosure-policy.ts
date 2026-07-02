import {
  unsupportedDisclosureError,
  type DepositIntent,
  type PrivacySdkError,
  type TransferIntent,
  type WithdrawIntent,
} from '@arcane/privacy-sdk-core';
import type { StellarAddress, StellarAssetId } from './types.js';

type Intent =
  | DepositIntent<StellarAddress, StellarAssetId, bigint>
  | TransferIntent<StellarAddress, StellarAssetId, bigint>
  | WithdrawIntent<StellarAddress, StellarAssetId, bigint>;

function isPublicWithdrawRoute(intent: Intent): boolean {
  return (
    intent.disclosure.recipientAddress === 'public' ||
    intent.disclosure.assetAddress === 'public' ||
    intent.disclosure.amount === 'public'
  );
}

export function validateStellarDisclosure(
  kind: 'deposit' | 'transfer' | 'withdraw',
  intent: Intent,
): PrivacySdkError[] {
  const errors: PrivacySdkError[] = [];

  if (kind === 'withdraw' && isPublicWithdrawRoute(intent)) {
    if (intent.disclosure.assetAddress === 'private') {
      errors.push(
        unsupportedDisclosureError(
          'assetAddress',
          'private',
          ['public'],
          'This withdrawal route publishes the asset identifier.',
        ),
      );
    }
    if (intent.disclosure.amount === 'private') {
      errors.push(
        unsupportedDisclosureError(
          'amount',
          'private',
          ['public'],
          'This withdrawal route publishes the withdrawal amount.',
        ),
      );
    }
  }

  if (kind === 'deposit' && intent.disclosure.senderAddress === 'private') {
    errors.push(
      unsupportedDisclosureError(
        'senderAddress',
        'private',
        ['public'],
        'Deposits from a public signer account cannot hide the sender address.',
      ),
    );
  }

  return errors;
}
