import { describe, expect, it } from 'vitest';
import type { RelayPackageJson, SafeDisplayMetadata } from '../src/types.js';

const DISPLAY_KINDS: SafeDisplayMetadata['kind'][] = [
  'deposit',
  'transfer',
  'withdraw',
];

describe('retired pending-claim and onboarding relay display', () => {
  it('does not keep pending_claim or onboarding display kinds', () => {
    expect(DISPLAY_KINDS).not.toContain('pending_claim');
    expect(DISPLAY_KINDS).not.toContain('onboarding');
  });

  it('does not keep an onboarding field on the relay package', () => {
    const relayPackage: RelayPackageJson = {
      version: 1,
      poolSelector: 'CPOOL',
      zkConfigNonce: '0',
      proofBytes: 'aa',
      publicSignals: 'bb',
      applicationIdHints: ['1', '1', '0', '0'],
      escrowRecipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      escrowAuthorization: 'opaque-auth-entry',
    };
    expect(relayPackage).not.toHaveProperty('onboarding');
    expect(relayPackage.escrowAuthorization).toBe('opaque-auth-entry');
  });
});
