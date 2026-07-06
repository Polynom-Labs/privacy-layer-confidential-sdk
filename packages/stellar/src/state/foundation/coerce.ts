export function withoutUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  const next = {} as T;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue !== undefined) {
      Reflect.set(next, key, fieldValue);
    }
  }
  return next;
}
