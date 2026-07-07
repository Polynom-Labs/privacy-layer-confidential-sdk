import {
  unsupportedDisclosureError,
  type DepositIntent,
  type PrivacySdkError,
  type WithdrawIntent,
} from '@arcanetech/privacy-sdk-core';
import type {
  StellarAddress,
  StellarAssetId,
  StellarTransferIntent,
} from '../types.js';
import {
  isPendingClaimTransfer,
  isPublicStellarRecipientTransfer,
  validatePendingClaimTransferDisclosure,
  validatePublicRecipientTransferDisclosure,
} from './disclosure-routes.js';

type Intent =
  | DepositIntent<StellarAddress, StellarAssetId, bigint>
  | StellarTransferIntent
  | WithdrawIntent<StellarAddress, StellarAssetId, bigint>;

function isPublicWithdrawRoute(intent: Intent): boolean {
  return (
    intent.disclosure.recipientAddress === 'public' ||
    intent.disclosure.assetAddress === 'public' ||
    intent.disclosure.amount === 'public'
  );
}

function rejectPrivatePublicRouteFields(
  intent: Intent,
  errors: PrivacySdkError[],
  assetMessage: string,
  amountMessage: string,
): void {
  if (intent.disclosure.assetAddress === 'private') {
    errors.push(
      unsupportedDisclosureError('assetAddress', 'private', ['public'], assetMessage),
    );
  }
  if (intent.disclosure.amount === 'private') {
    errors.push(
      unsupportedDisclosureError('amount', 'private', ['public'], amountMessage),
    );
  }
}

export function validateStellarDisclosure(
  kind: 'deposit' | 'transfer' | 'withdraw',
  intent: Intent,
): PrivacySdkError[] {
  const errors: PrivacySdkError[] = [];

  if (kind === 'transfer' && isPublicStellarRecipientTransfer(intent)) {
    errors.push(...validatePublicRecipientTransferDisclosure(intent.disclosure));
  }

  if (kind === 'transfer' && isPendingClaimTransfer(intent)) {
    errors.push(...validatePendingClaimTransferDisclosure(intent.disclosure));
  }

  if (kind === 'withdraw' && isPublicWithdrawRoute(intent)) {
    rejectPrivatePublicRouteFields(
      intent,
      errors,
      'This withdrawal route publishes the asset identifier.',
      'This withdrawal route publishes the withdrawal amount.',
    );
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
