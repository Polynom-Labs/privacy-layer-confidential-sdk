import { createInMemoryStateAdapter } from '@arcane/privacy-sdk-state-memory';
import { describe, expect, it } from 'vitest';
import { createRecord, createTestClient } from './stellar-client.test-helpers.js';

describe('StellarPrivacyClient state API', () => {
  it('appends pending claims and reads registration cache', async () => {
    const { client } = await createTestClient({
      state: createInMemoryStateAdapter({
        registry: {
          registeredAddresses: {
            'G-RECIPIENT': true,
          },
        },
      }),
    });

    await client.appendPendingClaims(
      [
        {
          id: 'claim-1',
          owner: 'G-OWNER',
          asset: 'USDC',
          amount: 10n,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      {
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      },
    );

    await expect(client.getPendingClaims()).resolves.toMatchObject({
      items: [expect.objectContaining({ id: 'claim-1' })],
      pagination: expect.objectContaining({ total: 1 }),
    });

    expect(await client.isStellarAddressRegistered('G-RECIPIENT')).toBe(true);
    expect(await client.isStellarAddressRegistered('G-UNKNOWN')).toBeUndefined();

    await client.invalidateRegisteredAddress('G-RECIPIENT');
    expect(await client.isStellarAddressRegistered('G-RECIPIENT')).toBeUndefined();

    await client.clearPendingClaims({ owner: 'G-OWNER' });
    await expect(client.getPendingClaims()).resolves.toMatchObject({
      items: [],
    });
  });

  it('cleans consumed private records', async () => {
    const consumed = createRecord('private-sender', 'USDC', 10n, 'used');
    consumed.consumed = true;
    const active = createRecord('private-sender', 'USDC', 20n, 'active');
    const { client } = await createTestClient({
      records: [consumed, active],
    });

    await client.pruneConsumedPrivateRecords();
    const records = await client.getPrivateRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('active');
  });
});
