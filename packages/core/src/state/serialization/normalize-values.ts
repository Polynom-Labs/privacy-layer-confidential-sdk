export function normalizeSerializableStateValues(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSerializableStateValues(entry));
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      normalized[key] = normalizeSerializableStateValues(entry);
    }
    return normalized;
  }
  return value;
}
