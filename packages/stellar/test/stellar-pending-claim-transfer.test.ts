import { describe, expect, it } from 'vitest';
import type { StellarPendingClaim } from '../src/types.js';
import { createTestClient } from './stellar-client.test-helpers.js';

const pendingClaimDisclosure = {
  senderAddress: 'public' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'public' as const,
  amount: 'public' as const,
};

function createSamplePendingClaim(
  overrides: Partial<StellarPendingClaim> = {},
): StellarPendingClaim {
  return {
    id: 'claim-1',
    owner: 'G-SENDER',
    asset: 'USDC',
    amount: 25n,
    createdAt: '2026-01-01T00:00:00.000Z',
    commitmentHex: '0x01',
    nullifierHex: '0x02',
    futureNullifierHashHex: '0x03',
    assetHiHex: '0x04',
    assetLoHex: '0x05',
    nullifierFieldHex: '0x06',
    secretHex: '0x07',
    tempPublicKeyXHex: '0x08',
    tempPublicKeyYHex: '0x09',
    encryptedRecoveryBase64: Buffer.from('a'.repeat(64), 'utf8').toString('base64'),
    ...overrides,
  };
}

describe('StellarPrivacyClient pending claim transfers', () => {
  it('prepares transfer from embedded pending claim source', async () => {
    const claim = createSamplePendingClaim();
    const { client } = await createTestClient();
    await client.upsertPendingClaims([claim]);
    const result = await client.transfer({
      from: { kind: 'pendingClaim', claim },
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure: pendingClaimDisclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }
    expect(result.prepared.consumedRecords).toHaveLength(1);
    expect(result.prepared.transactArtifacts?.spendSource).toBe('pendingClaim');
    expect(result.prepared.outputRecords).toEqual([
      expect.objectContaining({
        owner: 'G-SENDER',
        privateAddress: 'stpl1-recipient',
        amount: 25n,
      }),
    ]);
  });

  it('resolves pending claim by id from state', async () => {
    const claim = createSamplePendingClaim({ id: 'claim-by-id' });
    const { client } = await createTestClient();
    await client.upsertPendingClaims([claim]);
    const result = await client.transfer({
      from: { kind: 'pendingClaim', claimId: 'claim-by-id' },
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure: pendingClaimDisclosure,
    });

    expect(result.status).toBe('prepared');
  });

  it('rejects pending claim transfer when claim owner mismatches wallet', async () => {
    const claim = createSamplePendingClaim({ owner: 'G-OTHER' });
    const { client } = await createTestClient();
    await client.upsertPendingClaims([claim]);
    const result = await client.transfer({
      from: { kind: 'pendingClaim', claim },
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure: pendingClaimDisclosure,
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
      if (result.errors[0]?.code === 'insufficient_state') {
        expect(result.errors[0].reason).toBe('pending_claim_owner_mismatch');
      }
    }
  });

  it('rejects pending claim transfer when claim is missing from state', async () => {
    const { client } = await createTestClient();
    const result = await client.transfer({
      from: { kind: 'pendingClaim', claimId: 'missing-claim' },
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure: pendingClaimDisclosure,
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
      if (result.errors[0]?.code === 'insufficient_state') {
        expect(result.errors[0].reason).toBe('pending_claim_not_found');
      }
    }
  });
});
