import type { RelayPackageJson } from './types.js';

export const RELAY_PACKAGE_VERSION_V1 = 1;

export type RelayPackageSerializable = {
  version: number;
  poolSelector: string;
  zkConfigNonce: { toString(): string } | string | number;
  proofBytes: string;
  publicSignals: string;
  applicationIdHints: string[];
  ciphertextBytes?: string;
  outputNoteEphemeralScalars?: string[];
  escrowAuthorization?: string;
  keyVersionHints?: Array<number | undefined | null>;
};

function nonceToString(value: RelayPackageSerializable['zkConfigNonce']): string {
  return typeof value === 'string' ? value : value.toString();
}

function copyKeyVersionHints(
  hints: NonNullable<RelayPackageSerializable['keyVersionHints']>,
): Array<number | undefined> {
  return hints.map((value) => (typeof value === 'number' ? value : undefined));
}

export function serializeRelayPackage(
  source: RelayPackageSerializable,
): RelayPackageJson {
  const body: RelayPackageJson = {
    version: source.version,
    poolSelector: source.poolSelector,
    zkConfigNonce: nonceToString(source.zkConfigNonce),
    proofBytes: source.proofBytes,
    publicSignals: source.publicSignals,
    applicationIdHints: [...source.applicationIdHints],
  };
  if (source.ciphertextBytes !== undefined) {
    body.ciphertextBytes = source.ciphertextBytes;
  }
  if (source.outputNoteEphemeralScalars !== undefined) {
    body.outputNoteEphemeralScalars = [...source.outputNoteEphemeralScalars];
  }
  if (source.escrowAuthorization !== undefined) {
    body.escrowAuthorization = source.escrowAuthorization;
  }
  if (source.keyVersionHints) {
    body.keyVersionHints = copyKeyVersionHints(source.keyVersionHints);
  }
  return body;
}

function readNonce(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return undefined;
}

function readHints(value: unknown): Array<number | undefined> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => (typeof entry === 'number' ? entry : undefined));
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  if (!value.every((entry) => typeof entry === 'string')) {
    return undefined;
  }
  return value;
}

function readApplicationIdHints(
  value: unknown,
): RelayPackageJson['applicationIdHints'] | undefined {
  return readStringArray(value);
}

function readWireRecord(payload: unknown): Record<string, unknown> | undefined {
  if (typeof payload !== 'object' || payload === null) {
    return undefined;
  }
  return payload as Record<string, unknown>;
}

export function deserializeRelayPackage(
  payload: unknown,
): RelayPackageJson | undefined {
  const record = readWireRecord(payload);
  if (
    !record ||
    record.version !== RELAY_PACKAGE_VERSION_V1 ||
    typeof record.proofBytes !== 'string'
  ) {
    return undefined;
  }
  if (
    typeof record.poolSelector !== 'string' ||
    typeof record.publicSignals !== 'string'
  ) {
    return undefined;
  }
  const zkConfigNonce = readNonce(record.zkConfigNonce);
  const applicationIdHints = readApplicationIdHints(record.applicationIdHints);
  if (!zkConfigNonce || !applicationIdHints) {
    return undefined;
  }
  const body: RelayPackageJson = {
    version: RELAY_PACKAGE_VERSION_V1,
    poolSelector: record.poolSelector,
    zkConfigNonce,
    proofBytes: record.proofBytes,
    publicSignals: record.publicSignals,
    applicationIdHints,
  };
  if (typeof record.ciphertextBytes === 'string') {
    body.ciphertextBytes = record.ciphertextBytes;
  }
  const outputNoteEphemeralScalars = readStringArray(record.outputNoteEphemeralScalars);
  if (outputNoteEphemeralScalars) {
    body.outputNoteEphemeralScalars = outputNoteEphemeralScalars;
  }
  if (typeof record.escrowAuthorization === 'string') {
    body.escrowAuthorization = record.escrowAuthorization;
  }
  const keyVersionHints = readHints(record.keyVersionHints);
  if (keyVersionHints) {
    body.keyVersionHints = keyVersionHints;
  }
  return body;
}
