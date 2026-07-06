import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { StateBridgeDefinition } from '@arcane/privacy-sdk-core/state';
import {
  bindReduxStateAdapter,
  createReduxStateAdapter,
  STATE_BRIDGE_APPLY_WRITE,
} from '../src/index.js';

describe('createReduxStateAdapter', () => {
  it('writes through redux reducer and reads from store branch', async () => {
    const bundle = createReduxStateAdapter({ reducerPath: 'privacySdkState' });
    const store = configureStore({
      reducer: {
        [bundle.reducerPath]: bundle.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(bundle.middleware),
    });
    bindReduxStateAdapter(bundle, store);

    const definitions: StateBridgeDefinition[] = [
      {
        type: 'seed',
        mode: 'write',
        schema: z
          .object({
            type: z.literal('seed'),
            value: z.number(),
          })
          .transform(({ type, value }) => ({
            type,
            operations: [
              {
                opType: 'primitiveSet' as const,
                jsonPath: '$.count',
                value,
              },
            ],
          })),
      },
      {
        type: 'readCount',
        mode: 'read',
        schema: z
          .object({
            type: z.literal('readCount'),
          })
          .transform(({ type }) => ({
            type,
            operations: [
              {
                opType: 'primitiveGet' as const,
                jsonPath: '$.count',
              },
            ],
          })),
      },
    ];

    bundle.bridge.init(definitions);
    await bundle.bridge.write({ type: 'seed', value: 5 });
    const count = await bundle.bridge.read<number>({ type: 'readCount' });
    expect(count).toBe(5);
  });

  it('serializes bigint operation payloads before dispatching applyWrite', async () => {
    const bundle = createReduxStateAdapter({ reducerPath: 'privacySdkState' });
    const dispatched: unknown[] = [];
    const store = configureStore({
      reducer: {
        [bundle.reducerPath]: bundle.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(bundle.middleware),
    });
    bindReduxStateAdapter(bundle, {
      getState: () => store.getState(),
      dispatch: (action) => {
        dispatched.push(action);
        store.dispatch(action);
      },
    });

    const definitions: StateBridgeDefinition[] = [
      {
        type: 'pushAmount',
        mode: 'write',
        schema: z
          .object({
            type: z.literal('pushAmount'),
            amount: z.coerce.bigint(),
          })
          .transform(({ type, amount }) => ({
            type,
            operations: [
              {
                opType: 'arrayPush' as const,
                jsonPath: '$.amounts',
                items: [{ amount }],
              },
            ],
          })),
      },
    ];
    bundle.bridge.init(definitions);
    await bundle.bridge.write({ type: 'pushAmount', amount: 150_000_000n });

    const action = dispatched.find(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        'type' in entry &&
        entry.type === STATE_BRIDGE_APPLY_WRITE,
    ) as {
      payload: { call: { operations: Array<{ items: Array<{ amount: unknown }> }> } };
    };
    expect(action.payload.call.operations[0]?.items[0]?.amount).toBe('150000000');

    const branch = store.getState()[bundle.reducerPath] as {
      amounts: Array<{ amount: unknown }>;
    };
    expect(branch.amounts[0]?.amount).toBe('150000000');
  });
});
