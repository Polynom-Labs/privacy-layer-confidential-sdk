import { describe, expect, it } from 'vitest';
import {
  PENDING_OPERATION_PHASE,
  SUBMISSION_PATH,
  createRelayApi,
  isRelayConfigured,
  resolveRelayOrigin,
  submitPreparedPrivateOperation,
} from '../src/index.js';
import { createTestPorts, newOperation } from './relay-runtime.harness.js';

describe('resolveRelayOrigin', () => {
  it('treats a missing or blank value as unconfigured', () => {
    expect(resolveRelayOrigin()).toBeUndefined();
    expect(resolveRelayOrigin('')).toBeUndefined();
    expect(resolveRelayOrigin('   ')).toBeUndefined();
  });

  it('keeps an explicit origin without stripping /api', () => {
    expect(resolveRelayOrigin('http://localhost:3010')).toBe('http://localhost:3010');
    expect(resolveRelayOrigin('http://localhost:3010/')).toBe('http://localhost:3010');
    expect(resolveRelayOrigin('http://localhost:3010/api')).toBe(
      'http://localhost:3010/api',
    );
  });
});

describe('isRelayConfigured', () => {
  it('is false until an origin is set', () => {
    expect(isRelayConfigured()).toBe(false);
    expect(isRelayConfigured({ origin: '' })).toBe(false);
    expect(isRelayConfigured({ origin: 'http://relay.test' })).toBe(true);
  });
});

describe('createRelayApi', () => {
  it('calls the substituted transport at the configured origin', async () => {
    const urls: string[] = [];
    const api = createRelayApi({
      origin: 'http://localhost:3010',
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

describe('relay runtime without configuration', () => {
  it('direct-submits a relay-path operation and never calls the relayer', async () => {
    const ports = createTestPorts();
    delete ports.relayConfig;
    ports.relayApi.createRequest = async () => {
      throw new Error('relayer must not be called');
    };
    const result = await submitPreparedPrivateOperation({
      ports,
      operation: newOperation(SUBMISSION_PATH.relay),
    });
    expect(ports.probe.directCalls).toEqual(['direct']);
    expect(result.outcome).toBe(PENDING_OPERATION_PHASE.succeeded);
    expect(result.txId).toBe('wallet-tx');
  });
});
