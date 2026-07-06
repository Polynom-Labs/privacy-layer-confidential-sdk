import { z } from 'zod';
import { arrayFilterRejectMatchSchema } from '../array-filter/match.js';

export const stateOperationOpTypes = [
  'arrayPush',
  'arrayFilter',
  'arrayClean',
  'recordGet',
  'recordSet',
  'recordDelete',
  'recordKeys',
  'recordValues',
  'recordEntries',
  'primitiveGet',
  'primitiveSet',
  'primitiveIncrement',
  'primitiveNull',
] as const;

export type StateOperationOpType = (typeof stateOperationOpTypes)[number];

const jsonPathSchema = z.string().min(1);

const baseOperationSchema = z.object({
  opType: z.enum(stateOperationOpTypes),
  jsonPath: jsonPathSchema,
});

export const arrayPushOperationSchema = baseOperationSchema.extend({
  opType: z.literal('arrayPush'),
  items: z.array(z.unknown()),
});

export const arrayFilterOperationSchema = baseOperationSchema.extend({
  opType: z.literal('arrayFilter'),
  itemSchemaKey: z.string().min(1),
  rejectWhen: arrayFilterRejectMatchSchema,
});

export const arrayCleanOperationSchema = baseOperationSchema.extend({
  opType: z.literal('arrayClean'),
});

export const recordGetOperationSchema = baseOperationSchema.extend({
  opType: z.literal('recordGet'),
  key: z.string(),
});

export const recordSetOperationSchema = baseOperationSchema.extend({
  opType: z.literal('recordSet'),
  key: z.string(),
  value: z.unknown(),
});

export const recordDeleteOperationSchema = baseOperationSchema.extend({
  opType: z.literal('recordDelete'),
  key: z.string(),
});

export const recordKeysOperationSchema = baseOperationSchema.extend({
  opType: z.literal('recordKeys'),
});

export const recordValuesOperationSchema = baseOperationSchema.extend({
  opType: z.literal('recordValues'),
});

export const recordEntriesOperationSchema = baseOperationSchema.extend({
  opType: z.literal('recordEntries'),
});

export const primitiveGetOperationSchema = baseOperationSchema.extend({
  opType: z.literal('primitiveGet'),
});

export const primitiveSetOperationSchema = baseOperationSchema.extend({
  opType: z.literal('primitiveSet'),
  value: z.unknown(),
});

export const primitiveIncrementOperationSchema = baseOperationSchema.extend({
  opType: z.literal('primitiveIncrement'),
  delta: z.number().optional(),
});

export const primitiveNullOperationSchema = baseOperationSchema.extend({
  opType: z.literal('primitiveNull'),
});

export const stateOperationSchema = z.discriminatedUnion('opType', [
  arrayPushOperationSchema,
  arrayFilterOperationSchema,
  arrayCleanOperationSchema,
  recordGetOperationSchema,
  recordSetOperationSchema,
  recordDeleteOperationSchema,
  recordKeysOperationSchema,
  recordValuesOperationSchema,
  recordEntriesOperationSchema,
  primitiveGetOperationSchema,
  primitiveSetOperationSchema,
  primitiveIncrementOperationSchema,
  primitiveNullOperationSchema,
]);

export type ArrayPushOperation = z.infer<typeof arrayPushOperationSchema>;
export type ArrayFilterOperation = z.infer<typeof arrayFilterOperationSchema>;
export type ArrayCleanOperation = z.infer<typeof arrayCleanOperationSchema>;
export type RecordGetOperation = z.infer<typeof recordGetOperationSchema>;
export type RecordSetOperation = z.infer<typeof recordSetOperationSchema>;
export type RecordDeleteOperation = z.infer<typeof recordDeleteOperationSchema>;
export type RecordKeysOperation = z.infer<typeof recordKeysOperationSchema>;
export type RecordValuesOperation = z.infer<typeof recordValuesOperationSchema>;
export type RecordEntriesOperation = z.infer<typeof recordEntriesOperationSchema>;
export type PrimitiveGetOperation = z.infer<typeof primitiveGetOperationSchema>;
export type PrimitiveSetOperation = z.infer<typeof primitiveSetOperationSchema>;
export type PrimitiveIncrementOperation = z.infer<
  typeof primitiveIncrementOperationSchema
>;
export type PrimitiveNullOperation = z.infer<typeof primitiveNullOperationSchema>;

export type StateOperation = z.infer<typeof stateOperationSchema>;

export const stateBridgeCallSchema = z.object({
  type: z.string().min(1),
  operations: z.array(stateOperationSchema).min(1),
});

export type StateBridgeCall = z.infer<typeof stateBridgeCallSchema>;

export type StateBridgeMode = 'read' | 'write';

export function createStateBridgeCallSchema<TType extends string>(
  type: TType,
  operationsSchema: z.ZodType<StateOperation[]>,
) {
  return z.object({
    type: z.literal(type),
    operations: operationsSchema,
  });
}
