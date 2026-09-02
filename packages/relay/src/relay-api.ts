import { relayApiOrigin } from './relay-api-origin.js';
import { RelayApiError } from './relay-api-error.js';
import { RELAY_PUBLIC_REASON } from './reasons.js';
import type {
  CreateRelayApiInput,
  RelayApi,
  RelayPackageJson,
  RelayRequestAccepted,
  RelayRequestStatus,
} from './types.js';

const HTTP_OK = 200;
const HTTP_ACCEPTED = 202;

type JsonRecord = Record<string, unknown>;
type RelayFetcher = typeof globalThis.fetch;

function asRecord(value: unknown): JsonRecord {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return {};
}

function readReason(payload: unknown, fallback: string): string {
  const record = asRecord(payload);
  return typeof record.reason === 'string' && record.reason.trim()
    ? record.reason
    : fallback;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function requestJson(input: {
  fetch: RelayFetcher;
  url: string;
  method: 'GET' | 'POST';
  body?: RelayPackageJson;
}): Promise<{ httpStatus: number; payload: unknown }> {
  const init: RequestInit = {
    method: input.method,
    headers: { Accept: 'application/json' },
  };
  if (input.body) {
    init.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    init.body = JSON.stringify(input.body);
  }
  const response = await input.fetch(input.url, init);
  const payload = await parseJson(response);
  return { httpStatus: response.status, payload };
}

function requireOkStatus(input: {
  httpStatus: number;
  payload: unknown;
  allowed: number[];
}): JsonRecord {
  if (input.allowed.includes(input.httpStatus)) {
    return asRecord(input.payload);
  }
  throw new RelayApiError({
    reason: readReason(input.payload, RELAY_PUBLIC_REASON.infrastructureFailed),
    httpStatus: input.httpStatus,
  });
}

function mapAccepted(record: JsonRecord): RelayRequestAccepted {
  return {
    relayRequestId: String(record.relayRequestId ?? ''),
    status: String(record.status ?? 'accepted'),
    createdAt: String(record.createdAt ?? ''),
    statusUrl: String(record.statusUrl ?? ''),
  };
}

function mapStatus(record: JsonRecord): RelayRequestStatus {
  const status: RelayRequestStatus = {
    relayRequestId: String(record.relayRequestId ?? ''),
    status: String(record.status ?? ''),
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? ''),
    retryAllowed: record.retryAllowed === true,
  };
  if (typeof record.attemptNumber === 'number') {
    status.attemptNumber = record.attemptNumber;
  }
  if (typeof record.transactionHash === 'string') {
    status.transactionHash = record.transactionHash;
  }
  if (typeof record.publicReason === 'string') {
    status.publicReason = record.publicReason;
  }
  return status;
}

function resolveFetcher(input: CreateRelayApiInput): RelayFetcher {
  return input.fetch ?? globalThis.fetch.bind(globalThis);
}

export function createRelayApi(input: CreateRelayApiInput): RelayApi {
  const baseUrl = relayApiOrigin(input.baseUrl);
  const fetchImpl = resolveFetcher(input);
  return {
    async createRequest(body) {
      const result = await requestJson({
        fetch: fetchImpl,
        url: `${baseUrl}/relay-requests`,
        method: 'POST',
        body,
      });
      return mapAccepted(
        requireOkStatus({
          httpStatus: result.httpStatus,
          payload: result.payload,
          allowed: [HTTP_ACCEPTED],
        }),
      );
    },
    async readStatus(relayRequestId) {
      const result = await requestJson({
        fetch: fetchImpl,
        url: `${baseUrl}/relay-requests/${relayRequestId}`,
        method: 'GET',
      });
      return mapStatus(
        requireOkStatus({
          httpStatus: result.httpStatus,
          payload: result.payload,
          allowed: [HTTP_OK],
        }),
      );
    },
    async retryAttempt(relayRequestId) {
      const result = await requestJson({
        fetch: fetchImpl,
        url: `${baseUrl}/relay-requests/${relayRequestId}/attempts`,
        method: 'POST',
      });
      return mapStatus(
        requireOkStatus({
          httpStatus: result.httpStatus,
          payload: result.payload,
          allowed: [HTTP_OK],
        }),
      );
    },
  };
}
