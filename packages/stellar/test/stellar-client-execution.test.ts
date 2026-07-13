import { describe, expect, it, vi } from 'vitest';
import { createFakeTransactEngine } from '../src/testing/index.js';
import type { StellarPolicyAdapter } from '../src/types.js';
import {
  createFailingStateAdapter,
  createRecord,
  createTestClient,
} from './stellar-client.test-helpers.js';
import { createInMemoryStateAdapter } from '@arcanetech/privacy-sdk-state-memory';

const disclosure = {
  senderAddress: 'private' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'private' as const,
  amount: 'private' as const,
};

describe('StellarPrivacyClient execution', () => {
  it('executes deposit happy path and commits state', async () => {
    const { client } = await createTestClient({
      records: [createRecord('owner', 'USDC', 100n)],
    });
    const result = await client.deposit({
      from: 'G-SENDER',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 100n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') {
      return;
    }

    const receipt = await result.execute();
    expect(receipt.confirmed).toBe(true);
    expect(await client.getPrivateRecords()).toHaveLength(2);
  });

  it('executes transfer and marks consumed records after confirmation', async () => {
    const record = createRecord('private-sender', 'USDC', 25n, 'spent');
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

    await result.execute();
    const records = await client.getPrivateRecords();
    expect(records.some((entry) => entry.id === 'spent' && entry.consumed)).toBe(true);
    expect(
      records.some(
        (entry) =>
          entry.owner === 'G-SENDER' && entry.privateAddress === 'private-recipient',
      ),
    ).toBe(true);
  });

  it('does not commit state when submission fails', async () => {
    const record = createRecord('private-sender', 'USDC', 25n, 'spent');
    const { client } = await createTestClient({
      records: [record],
      engine: createFakeTransactEngine({
        submit: async () => {
          throw new Error('submission failed');
        },
      }),
    });

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

    await expect(result.execute()).rejects.toMatchObject({ code: 'execution_error' });
    const records = await client.getPrivateRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.consumed).toBe(false);
  });

  it('reports storageCommit failure after confirmed submit', async () => {
    const record = createRecord('private-sender', 'USDC', 25n, 'spent');
    const baseState = createInMemoryStateAdapter({
      privateRecords: [record],
    });
    const state = createFailingStateAdapter(baseState, {
      failOnType: 'savePrivateRecords',
    });
    const { client } = await createTestClient({ state });
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

    const errorEvents: Array<{ stage?: string }> = [];
    await expect(
      result.execute({
        onEvent: (event) => {
          if (event.status === 'error') {
            errorEvents.push(event);
          }
        },
      }),
    ).rejects.toMatchObject({
      code: 'execution_error',
      stage: 'storageCommit',
      details: {
        receipt: expect.objectContaining({ confirmed: true }),
      },
    });
    expect(errorEvents.some((event) => event.stage === 'storageCommit')).toBe(true);
    const records = await client.getPrivateRecords();
    expect(records[0]?.consumed).toBe(false);
  });

  it('emits progress events in stage order', async () => {
    const events: string[] = [];
    const { client } = await createTestClient();
    const result = await client.deposit({
      from: 'G-SENDER',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 100n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    if (result.status !== 'prepared') {
      throw new Error('Expected prepared operation');
    }

    await result.execute({
      onEvent: (event) => {
        if (event.status === 'begin') {
          events.push(event.stage);
        }
      },
    });

    expect(events).toEqual([
      'validation',
      'stateRead',
      'authorization',
      'preparation',
      'policyCheck',
      'submission',
      'confirmation',
      'storageCommit',
    ]);
  });

  it('stops execution when abort signal is already aborted', async () => {
    const submit = vi.fn(async () => ({ operationId: 'x', confirmed: true }));
    const { client } = await createTestClient({
      engine: createFakeTransactEngine({ submit }),
    });
    const result = await client.deposit({
      from: 'G-SENDER',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 100n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    if (result.status !== 'prepared') {
      throw new Error('Expected prepared operation');
    }

    const controller = new AbortController();
    controller.abort();
    await expect(result.execute({ signal: controller.signal })).rejects.toThrow(
      /aborted/i,
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects policy failures before submission', async () => {
    const policy: StellarPolicyAdapter = {
      inspectOperation: async () => {
        throw new Error('policy rejected');
      },
    };
    const submit = vi.fn();
    const { client } = await createTestClient({
      policy,
      engine: createFakeTransactEngine({ submit }),
    });

    const result = await client.transfer({
      from: 'private-sender',
      to: 'private-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure,
    });

    expect(result.status).toBe('rejected');
    expect(submit).not.toHaveBeenCalled();
  });
});
