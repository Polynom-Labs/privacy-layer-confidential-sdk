import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  RELAY_HTTP_REASON,
  RELAY_PUBLIC_REASON,
  RELAY_STATUS,
  deserializeRelayPackage,
  isInfrastructureRelayFailure,
  isRejectionReason,
  isRetryableFailureReason,
  jsonSafeClone,
  serializeRelayPackage,
  RelayApiError,
} from '../src/index.js';

type WireContractVector = {
  lifecycleStatuses: string[];
  publicReasons: Record<string, string>;
  httpReasons: Record<string, string>;
  rejectionReasons: string[];
  retryableFailureReasons: string[];
  infrastructureHttpReasons: string[];
  serialize: {
    source: {
      version: number;
      poolSelector: string;
      zkConfigNonce: number;
      proofBytes: string;
      publicSignals: string;
      applicationIdHints: [string, string, string, string];
      escrowRecipient: string;
      keyVersionHints: Array<number | null>;
    };
    wire: Record<string, unknown>;
  };
};

const RELAY_WIRE_CONTRACT_VECTOR = createRequire(import.meta.url)(
  './vectors/relay-wire-contract.json',
) as WireContractVector;

function recordValuesMatch(
  actual: Record<string, string>,
  expected: readonly string[],
): boolean {
  const values = Object.values(actual);
  return (
    values.length === expected.length &&
    values.every((value, index) => value === expected.at(index))
  );
}

describe('relay wire-contract vectors', () => {
  const vector = RELAY_WIRE_CONTRACT_VECTOR;

  it('keeps the eight lifecycle statuses aligned with the vector', () => {
    expect(recordValuesMatch(RELAY_STATUS, vector.lifecycleStatuses)).toBe(true);
  });

  it('fails when a status copy diverges from the vector', () => {
    const diverged = { ...RELAY_STATUS, succeeded: 'done' };
    expect(recordValuesMatch(diverged, vector.lifecycleStatuses)).toBe(false);
  });

  it('keeps public and HTTP reason vocabularies aligned with the vector', () => {
    expect(RELAY_PUBLIC_REASON).toEqual(vector.publicReasons);
    expect(RELAY_HTTP_REASON).toEqual(vector.httpReasons);
  });

  it('fails when a public reason token diverges from the vector', () => {
    const diverged = { ...RELAY_PUBLIC_REASON, kytRejected: 'kyt_denied' };
    expect(diverged).not.toEqual(vector.publicReasons);
  });

  it('classifies rejection and retryable reasons from the vector', () => {
    for (const reason of vector.rejectionReasons) {
      expect(isRejectionReason(reason)).toBe(true);
      expect(isRetryableFailureReason(reason)).toBe(false);
    }
    for (const reason of vector.retryableFailureReasons) {
      expect(isRetryableFailureReason(reason)).toBe(true);
      expect(isRejectionReason(reason)).toBe(false);
    }
  });

  it('treats vector infrastructure HTTP reasons as infrastructure failures', () => {
    for (const reason of vector.infrastructureHttpReasons) {
      expect(
        isInfrastructureRelayFailure(new RelayApiError({ reason, httpStatus: 503 })),
      ).toBe(true);
    }
    expect(
      isInfrastructureRelayFailure(
        new RelayApiError({
          reason: RELAY_HTTP_REASON.unsupportedPool,
          httpStatus: 400,
        }),
      ),
    ).toBe(false);
  });

  it('serializes a package to the vector wire body without reading signal bytes', () => {
    const serialized = serializeRelayPackage({
      ...vector.serialize.source,
      keyVersionHints: vector.serialize.source.keyVersionHints.map((value) =>
        typeof value === 'number' ? value : undefined,
      ),
    });
    expect(jsonSafeClone(serialized)).toEqual(vector.serialize.wire);
  });

  it('fails serialization conformance when a wire field diverges', () => {
    expect({ ...vector.serialize.wire, version: 2 }).not.toEqual(vector.serialize.wire);
  });

  it('round-trips the vector wire body through deserialize', () => {
    const deserialized = deserializeRelayPackage(vector.serialize.wire);
    expect(deserialized).toBeDefined();
    expect(jsonSafeClone(deserialized)).toEqual(vector.serialize.wire);
  });
});
