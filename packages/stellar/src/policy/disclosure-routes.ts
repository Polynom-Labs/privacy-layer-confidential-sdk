import {
  unsupportedDisclosureError,
  type DisclosurePolicy,
  type PrivacySdkError,
} from '@arcanetech/privacy-sdk-core';
import type { StellarTransferIntent } from '../types.js';

export function validatePublicRecipientTransferDisclosure(
  disclosure: DisclosurePolicy,
): PrivacySdkError[] {
  const errors: PrivacySdkError[] = [];
  const fields: Array<keyof DisclosurePolicy> = [
    'recipientAddress',
    'assetAddress',
    'amount',
  ];
  const messages: Partial<Record<keyof DisclosurePolicy, string>> = {
    recipientAddress:
      'Transfers to a public Stellar recipient must publish the recipient address.',
    assetAddress:
      'Transfers to a public Stellar recipient must publish the asset identifier.',
    amount: 'Transfers to a public Stellar recipient must publish the transfer amount.',
  };
  for (const field of fields) {
    if (disclosure[field] === 'private') {
      errors.push(
        unsupportedDisclosureError(
          field,
          'private',
          ['public'],
          messages[field] ?? 'This transfer route requires public disclosure.',
        ),
      );
    }
  }
  return errors;
}

export function isPublicStellarRecipientTransfer(
  intent: StellarTransferIntent,
): boolean {
  return intent.disclosure.recipientAddress === 'public';
}
