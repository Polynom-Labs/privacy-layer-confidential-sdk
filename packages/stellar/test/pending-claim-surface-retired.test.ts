import { describe, expect, it } from 'vitest';
import {
  assertEscrowSweepClaimant,
  deriveEscrowRecipientFromStellarAddress,
  prepareEscrowSweepOperation,
  reconstructEscrowNote,
} from '../src/transact/index.js';
import { createTestClient } from './stellar-client.test-helpers.js';

describe('retired pending-claim client surface', () => {
  it('does not expose pending-claim state or backend methods', async () => {
    const { client } = await createTestClient();
    expect(client).not.toHaveProperty('getPendingClaims');
    expect(client).not.toHaveProperty('upsertPendingClaims');
    expect(client).not.toHaveProperty('loadPendingClaimsFromBackend');
    expect(client).not.toHaveProperty('loadPendingClaimsCountFromBackend');
    expect(client).not.toHaveProperty('appendPendingClaims');
    expect(client).not.toHaveProperty('replacePendingClaimsPage');
  });

  it('escrow send, discovery, and claim still compile against the remaining surface', () => {
    expect(typeof deriveEscrowRecipientFromStellarAddress).toBe('function');
    expect(typeof reconstructEscrowNote).toBe('function');
    expect(typeof prepareEscrowSweepOperation).toBe('function');
    expect(typeof assertEscrowSweepClaimant).toBe('function');
  });
});
