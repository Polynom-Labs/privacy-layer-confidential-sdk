import { z } from 'zod';

export type ArrayFilterRejectMatch =
  | {
      op: 'fieldEquals';
      field: string;
      value: unknown;
    }
  | {
      op: 'fieldIn';
      field: string;
      values: unknown[];
    }
  | {
      op: 'and';
      matches: ArrayFilterRejectMatch[];
    };

export const arrayFilterRejectMatchSchema = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({
      op: z.literal('fieldEquals'),
      field: z.string().min(1),
      value: z.any(),
    }),
    z.object({
      op: z.literal('fieldIn'),
      field: z.string().min(1),
      values: z.array(z.any()),
    }),
    z.object({
      op: z.literal('and'),
      matches: z.array(arrayFilterRejectMatchSchema).min(1),
    }),
  ]),
) as z.ZodType<ArrayFilterRejectMatch>;

const arrayFilterItemSchemas = new Map<string, z.ZodTypeAny>();

export function registerArrayFilterItemSchema(key: string, schema: z.ZodTypeAny): void {
  arrayFilterItemSchemas.set(key, schema);
}

export function getArrayFilterItemSchema(key: string): z.ZodTypeAny | undefined {
  return arrayFilterItemSchemas.get(key);
}

function readFieldValue(item: Record<string, unknown>, field: string): unknown {
  return Reflect.get(item, field);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (typeof left === 'bigint' || typeof right === 'bigint') {
    try {
      return BigInt(String(left)) === BigInt(String(right));
    } catch {
      return false;
    }
  }
  return Object.is(left, right);
}

function valueInList(value: unknown, values: unknown[]): boolean {
  return values.some((candidate) => valuesEqual(value, candidate));
}

export function shouldRejectArrayItem(
  item: Record<string, unknown>,
  rejectWhen: ArrayFilterRejectMatch,
): boolean {
  switch (rejectWhen.op) {
    case 'fieldEquals': {
      return valuesEqual(readFieldValue(item, rejectWhen.field), rejectWhen.value);
    }
    case 'fieldIn': {
      return valueInList(readFieldValue(item, rejectWhen.field), rejectWhen.values);
    }
    case 'and': {
      return rejectWhen.matches.every((match) => shouldRejectArrayItem(item, match));
    }
    default: {
      return false;
    }
  }
}

export function filterArrayByRejectMatch(
  items: unknown[],
  itemSchemaKey: string,
  rejectWhen: ArrayFilterRejectMatch,
): unknown[] {
  const schema = arrayFilterItemSchemas.get(itemSchemaKey);
  if (schema === undefined) {
    throw new Error(`Unknown array filter item schema key: ${itemSchemaKey}`);
  }

  return items.filter((item) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      return false;
    }
    return !shouldRejectArrayItem(parsed.data as Record<string, unknown>, rejectWhen);
  });
}
