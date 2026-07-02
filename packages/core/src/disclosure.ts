export type Disclosure = 'private' | 'public';

export interface DisclosurePolicy {
  senderAddress: Disclosure;
  recipientAddress: Disclosure;
  assetAddress: Disclosure;
  amount: Disclosure;
}

export const DISCLOSURE_POLICY_FIELDS: readonly (keyof DisclosurePolicy)[] = [
  'senderAddress',
  'recipientAddress',
  'assetAddress',
  'amount',
] as const;
