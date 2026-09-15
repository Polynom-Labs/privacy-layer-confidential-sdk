const RELAY_REQUESTS_SEGMENT = 'relay-requests';

export function resolveRelayOrigin(origin?: string): string | undefined {
  const trimmed = origin?.trim().replace(/\/$/u, '');
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

export function joinRelayApiUrl(origin: string, ...pathSegments: string[]): string {
  const base = requireRelayOrigin(origin);
  const rest = [RELAY_REQUESTS_SEGMENT, ...pathSegments].flatMap((segment) =>
    segment.split('/').filter((part) => part.length > 0),
  );
  return [base, ...rest].join('/');
}

export function isRelayConfigured(config?: { origin?: string }): boolean {
  return Boolean(resolveRelayOrigin(config?.origin));
}

export function requireRelayOrigin(origin?: string): string {
  const resolved = resolveRelayOrigin(origin);
  if (!resolved) {
    throw new Error('Relay API origin is not configured.');
  }
  return resolved;
}

export function requireRelayApi<T>(ports: { relayApi?: T }): T {
  if (!ports.relayApi) {
    throw new Error('Relay API is not configured.');
  }
  return ports.relayApi;
}
