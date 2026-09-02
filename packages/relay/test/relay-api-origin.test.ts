import { describe, expect, it } from 'vitest';
import { createRelayApi, relayApiOrigin } from '../src/index.js';

describe('relayApiOrigin', () => {
  it('strips a trailing /api prefix so the relay transport stays at the host origin', () => {
    expect(relayApiOrigin('/api')).toBe('');
    expect(relayApiOrigin('http://localhost:3010/api')).toBe('http://localhost:3010');
    expect(relayApiOrigin('http://localhost:3010/api/')).toBe('http://localhost:3010');
  });

  it('leaves a host that already serves the relay transport unchanged', () => {
    expect(relayApiOrigin('http://localhost:3010')).toBe('http://localhost:3010');
    expect(relayApiOrigin('')).toBe('');
  });
});

describe('createRelayApi', () => {
  it('calls the substituted transport at the stripped origin', async () => {
    const urls: string[] = [];
    const api = createRelayApi({
      baseUrl: 'http://localhost:3010/api',
      fetch: async (input) => {
        urls.push(String(input));
        return Response.json(
          {
            relayRequestId: 'relay-1',
            status: 'queued',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:02.000Z',
            retryAllowed: false,
          },
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
    });
    const status = await api.readStatus('relay-1');
    expect(urls).toEqual(['http://localhost:3010/relay-requests/relay-1']);
    expect(status.relayRequestId).toBe('relay-1');
    expect(status.status).toBe('queued');
  });
});
