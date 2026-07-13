import { describe, expect, it } from 'vitest';
import { resolveStellarPrivacyClientConfig } from '../src/client/resolve-config.js';
import { createFakeTransactEngine } from '../src/testing/index.js';
import type { StellarPrivacyClientConfigBase } from '../src/types.js';
import { createRecord, createTestClient } from './stellar-client.test-helpers.js';

const disclosure = {
  senderAddress: 'private' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'private' as const,
  amount: 'private' as const,
};

describe('createStellarPrivacyClient config validation', () => {
  it('rejects missing dependencies', async () => {
    const resolved = await resolveStellarPrivacyClientConfig(
      {} as StellarPrivacyClientConfigBase,
      async () => createFakeTransactEngine(),
    );

    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(
        resolved.result.errors.some((error) => error.code === 'missing_dependency'),
      ).toBe(true);
    }
  });
});

describe('StellarPrivacyClient preparation', () => {
  it('rejects public recipient transfer unless recipient, asset, and amount are public', async () => {
    const { client } = await createTestClient();
    const result = await client.transfer({
      from: 'private-sender',
      to: 'G-UNREGISTERED',
      asset: 'USDC',
      amount: 10n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'private',
        amount: 'private',
      },
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      const unsupportedFields = result.errors
        .filter((error) => error.code === 'unsupported_disclosure')
        .map((error) =>
          error.code === 'unsupported_disclosure' ? error.field : undefined,
        );
      expect(unsupportedFields).toEqual(
        expect.arrayContaining(['assetAddress', 'amount']),
      );
      expect(unsupportedFields).not.toContain('senderAddress');
    }
  });

  it.each([
    {
      senderAddress: 'private' as const,
      label: 'private sender',
    },
    {
      senderAddress: 'public' as const,
      label: 'fully public sender',
    },
  ])(
    'passes public recipient transfer with $label before state checks',
    async ({ senderAddress }) => {
      const { client } = await createTestClient({ records: [] });
      const result = await client.transfer({
        from: 'private-sender',
        to: 'G-UNREGISTERED',
        asset: 'USDC',
        amount: 10n,
        disclosure: {
          senderAddress,
          recipientAddress: 'public',
          assetAddress: 'public',
          amount: 'public',
        },
      });

      expect(result.status).toBe('rejected');
      if (result.status === 'rejected') {
        expect(
          result.errors.some((error) => error.code === 'unsupported_disclosure'),
        ).toBe(false);
        expect(result.errors[0]?.code).toBe('insufficient_state');
      }
    },
  );

  it('rejects unsupported withdraw disclosure combinations', async () => {
    const { client } = await createTestClient();
    const result = await client.withdraw({
      from: 'private-sender',
      to: 'public-recipient',
      asset: 'USDC',
      amount: 10n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'private',
        amount: 'private',
      },
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('unsupported_disclosure');
    }
  });

  it('returns insufficient_state when state has no private records', async () => {
    const { client } = await createTestClient({ records: [] });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
    }
  });

  it('rejects when available records total is below requested amount', async () => {
    const { client } = await createTestClient({
      records: [
        createRecord('private-sender', 'USDC', 10n, 'a'),
        createRecord('private-sender', 'USDC', 10n, 'b'),
      ],
    });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
      if (result.errors[0]?.code === 'insufficient_state') {
        expect(result.errors[0].reason).toBe('missing_private_records');
      }
    }
  });

  it('consumes multiple private records when one note is insufficient', async () => {
    const recordA = createRecord('private-sender', 'USDC', 10n, 'a');
    const recordB = createRecord('private-sender', 'USDC', 20n, 'b');
    const { client } = await createTestClient({ records: [recordA, recordB] });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.consumedRecords).toHaveLength(2);
    expect(result.prepared.consumedRecords.map((record) => record.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('consumes up to two private records for withdraw when one note is insufficient', async () => {
    const recordA = createRecord('private-sender', 'USDC', 10n, 'a');
    const recordB = createRecord('private-sender', 'USDC', 20n, 'b');
    const { client } = await createTestClient({ records: [recordA, recordB] });
    const result = await client.withdraw({
      from: 'private-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 25n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.consumedRecords).toHaveLength(2);
    expect(result.prepared.consumedRecords.map((record) => record.id)).toEqual([
      'b',
      'a',
    ]);
  });

  it('rejects withdraw when amount exceeds the two largest notes', async () => {
    const { client } = await createTestClient({
      records: [
        createRecord('private-sender', 'USDC', 10n, 'a'),
        createRecord('private-sender', 'USDC', 20n, 'b'),
        createRecord('private-sender', 'USDC', 30n, 'c'),
      ],
    });
    const result = await client.withdraw({
      from: 'private-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 55n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.errors[0]?.code).toBe('insufficient_state');
      if (result.errors[0]?.code === 'insufficient_state') {
        expect(result.errors[0].reason).toBe('missing_private_records');
      }
    }
  });
});

describe('StellarPrivacyClient output records', () => {
  it('creates sender change output when input exceeds transfer amount', async () => {
    const record = createRecord('private-sender', 'USDC', 100n, 'a');
    const { client } = await createTestClient({ records: [record] });
    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.outputRecords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner: 'G-SENDER',
          privateAddress: 'private-recipient',
          amount: 25n,
        }),
        expect.objectContaining({
          owner: 'G-SENDER',
          privateAddress: 'private-sender',
          amount: 75n,
        }),
      ]),
    );
  });

  it('stores private address on sender change output after execution', async () => {
    const record = createRecord('stpl1-sender', 'USDC', 100n, 'a');
    const { client } = await createTestClient({ records: [record] });
    const result = await client.transfer({
      from: 'stpl1-sender',
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    await result.execute();
    const records = await client.getPrivateRecords();
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner: 'G-SENDER',
          amount: 75n,
          privateAddress: 'stpl1-sender',
        }),
      ]),
    );
  });

  it('creates sender change output for public withdraw with surplus input', async () => {
    const record = createRecord('private-sender', 'USDC', 100n, 'a');
    const { client } = await createTestClient({ records: [record] });
    const result = await client.withdraw({
      from: 'private-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 25n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    expect(result.prepared.outputRecords).toEqual([
      expect.objectContaining({
        owner: 'G-SENDER',
        privateAddress: 'private-sender',
        amount: 75n,
      }),
    ]);
  });
});
