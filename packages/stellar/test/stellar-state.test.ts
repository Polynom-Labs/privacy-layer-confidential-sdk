import { createInMemoryStateAdapter } from '@arcanetech/privacy-sdk-state-memory';
import { describe, expect, it } from 'vitest';
import { createRecord, createTestClient } from './stellar-client.test-helpers.js';

describe('StellarPrivacyClient state API', () => {
  it('reads and invalidates registration cache', async () => {
    const { client } = await createTestClient({
      state: createInMemoryStateAdapter({
        registry: {
          registeredAddresses: {
            'G-RECIPIENT': true,
          },
        },
      }),
    });

    expect(await client.isStellarAddressRegistered('G-RECIPIENT')).toBe(true);
    expect(await client.isStellarAddressRegistered('G-UNKNOWN')).toBeUndefined();

    await client.invalidateRegisteredAddress('G-RECIPIENT');
    expect(await client.isStellarAddressRegistered('G-RECIPIENT')).toBeUndefined();
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
