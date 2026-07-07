import { describe, expect, it } from 'vitest';
import { createInMemoryStateAdapter } from '../src/index.js';
import {
  createStateBridge,
  type StateBridgeDefinition,
} from '@arcanetech/privacy-sdk-core/state';
import { z } from 'zod';

describe('createInMemoryStateAdapter', () => {
  it('applies write operations atomically', async () => {
    const adapter = createInMemoryStateAdapter();
    const definitions: StateBridgeDefinition[] = [
      {
        type: 'seed',
        mode: 'write',
        schema: z
          .object({
            type: z.literal('seed'),
            items: z.array(z.number()),
          })
          .transform(({ type, items }) => ({
            type,
            operations: [
              {
                opType: 'arrayPush' as const,
                jsonPath: '$.items',
                items,
              },
            ],
          })),
      },
      {
        type: 'readItems',
        mode: 'read',
        schema: z
          .object({
            type: z.literal('readItems'),
          })
          .transform(({ type }) => ({
            type,
            operations: [
              {
                opType: 'primitiveGet' as const,
                jsonPath: '$.items',
              },
            ],
          })),
      },
    ];

    const bridge = createStateBridge(adapter);
    bridge.init(definitions);

    await bridge.write({ type: 'seed', items: [1, 2] });
    const items = await bridge.read<unknown[]>({ type: 'readItems' });
    expect(items).toEqual([1, 2]);
  });
});
