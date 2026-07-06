import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  arrayFilterOperationSchema,
  arrayPushOperationSchema,
  createStateBridge,
  registerArrayFilterItemSchema,
  StateBridgeValidationError,
  type StateBridgeDefinition,
} from '../src/state/index.js';

const itemSchema = z.object({
  id: z.string(),
  owner: z.string(),
  consumed: z.boolean(),
});

registerArrayFilterItemSchema('testItem', itemSchema);

describe('createStateBridge', () => {
  it('validates and delegates write calls', async () => {
    const writes: unknown[] = [];
    const definitions: StateBridgeDefinition[] = [
      {
        type: 'setCount',
        mode: 'write',
        schema: z
          .object({
            type: z.literal('setCount'),
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
    ];

    const bridge = createStateBridge({
      registerDefinition() {},
      async write(call) {
        writes.push(call);
      },
      async read<TResult>() {
        return undefined as TResult;
      },
    });

    bridge.init(definitions);
    await bridge.write({ type: 'setCount', value: 3 });
    expect(writes).toHaveLength(1);
  });

  it('rejects unknown call types', async () => {
    const bridge = createStateBridge({
      registerDefinition() {},
      async write() {},
      async read<TResult>() {
        return undefined as TResult;
      },
    });

    await expect(
      bridge.write({ type: 'missing', operations: [] }),
    ).rejects.toMatchObject({
      code: 'execution_error',
    });
  });

  it('rejects write on read-only type', async () => {
    const bridge = createStateBridge({
      registerDefinition() {},
      async write() {},
      async read<TResult>() {
        return undefined as TResult;
      },
    });

    bridge.init([
      {
        type: 'readOnly',
        mode: 'read',
        schema: z
          .object({
            type: z.literal('readOnly'),
          })
          .transform(({ type }) => ({
            type,
            operations: [
              {
                opType: 'primitiveGet' as const,
                jsonPath: '$.value',
              },
            ],
          })),
      },
    ]);

    await expect(bridge.write({ type: 'readOnly' })).rejects.toBeInstanceOf(
      StateBridgeValidationError,
    );
  });
});

describe('stateOperationSchema', () => {
  it('accepts array push operations', () => {
    const parsed = arrayPushOperationSchema.parse({
      opType: 'arrayPush',
      jsonPath: '$.items',
      items: [1, 2],
    });
    expect(parsed.items).toEqual([1, 2]);
  });

  it('accepts serializable array filter operations', () => {
    const parsed = arrayFilterOperationSchema.parse({
      opType: 'arrayFilter',
      jsonPath: '$.items',
      itemSchemaKey: 'testItem',
      rejectWhen: {
        op: 'fieldIn',
        field: 'id',
        values: ['a', 'b'],
      },
    });
    expect(parsed.rejectWhen).toMatchObject({
      op: 'fieldIn',
      field: 'id',
    });
  });
});
