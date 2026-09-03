import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  RELAY_HTTP_REASON,
  RELAY_PACKAGE_VERSION_V1,
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
      escrowAuthorization: string;
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

  it('keeps public and HTTP reason vocabularies aligned with the vector', () => {
    expect(RELAY_PUBLIC_REASON).toEqual(vector.publicReasons);
    expect(RELAY_HTTP_REASON).toEqual(vector.httpReasons);
  });

  it('keeps the package version aligned with the vector', () => {
    expect(RELAY_PACKAGE_VERSION_V1).toBe(vector.serialize.wire.version);
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

  it('round-trips the vector wire body through deserialize', () => {
    const deserialized = deserializeRelayPackage(vector.serialize.wire);
    expect(deserialized).toBeDefined();
    expect(jsonSafeClone(deserialized)).toEqual(vector.serialize.wire);
  });

  it('copies an opaque escrow authorization without reading note secrets from package bytes', () => {
    const credential = vector.serialize.source.escrowAuthorization;
    const withSecret = {
      ...vector.serialize.wire,
      coinNote: { secret: 'must-not-round-trip' },
      spendScalar: 'deadbeef',
    };
    const deserialized = deserializeRelayPackage(withSecret);
    expect(deserialized?.escrowAuthorization).toBe(credential);
    expect(deserialized).not.toHaveProperty('coinNote');
    expect(deserialized).not.toHaveProperty('spendScalar');
    expect(deserialized?.proofBytes).toBe(vector.serialize.wire.proofBytes);
    expect(deserialized?.publicSignals).toBe(vector.serialize.wire.publicSignals);
  });

  it('ignores a leftover wire escrowRecipient instead of persisting it', () => {
    const leftover = {
      ...vector.serialize.wire,
      escrowRecipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    };
    const deserialized = deserializeRelayPackage(leftover);
    expect(deserialized).not.toHaveProperty('escrowRecipient');
    expect(jsonSafeClone(deserialized)).toEqual(vector.serialize.wire);
  });
});
