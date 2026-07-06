const MILLISECONDS_PER_SECOND = 1000;
const UNIX_TIMESTAMP_SECONDS_ABOVE_WHICH_VALUE_IS_MS = 1_000_000_000_000;

export function parseStellarRpcUnixTimestampSeconds(
  value: unknown,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  const integral = Math.trunc(numeric);
  if (integral >= UNIX_TIMESTAMP_SECONDS_ABOVE_WHICH_VALUE_IS_MS) {
    return Math.trunc(integral / MILLISECONDS_PER_SECOND);
  }
  return integral;
}
