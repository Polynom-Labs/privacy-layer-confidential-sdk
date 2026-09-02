export function jsonSafeClone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, jsonSafeReplacer)) as unknown;
}

function jsonSafeReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Uint8Array) {
    return { type: 'Buffer', data: [...value] };
  }
  return value;
}
