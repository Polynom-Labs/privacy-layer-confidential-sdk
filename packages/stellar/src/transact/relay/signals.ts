import { Buffer } from 'buffer';
import {
  RELAY_TRANSACT_FIELD_BYTES,
  RELAY_TRANSACT_SIGNAL_PREFIX_BYTES,
  RELAY_TRANSACT_SUPPORTED_SIGNAL_COUNT,
} from './constants.js';

const SUPPORTED_SIGNAL_BYTES =
  RELAY_TRANSACT_SUPPORTED_SIGNAL_COUNT * RELAY_TRANSACT_FIELD_BYTES;

function decodePublicSignalBytes(publicSignals: string): Buffer {
  return Buffer.from(publicSignals.replace(/^0x/iu, ''), 'hex');
}

function hasSupportedLengthPrefix(bytes: Buffer): boolean {
  if (bytes.length !== RELAY_TRANSACT_SIGNAL_PREFIX_BYTES + SUPPORTED_SIGNAL_BYTES) {
    return false;
  }
  return bytes.readUInt32BE(0) === RELAY_TRANSACT_SUPPORTED_SIGNAL_COUNT;
}

export function assertSupportedPublicSignals(publicSignals: string): void {
  const bytes = decodePublicSignalBytes(publicSignals);
  if (bytes.length === SUPPORTED_SIGNAL_BYTES || hasSupportedLengthPrefix(bytes)) {
    return;
  }
  throw new Error(
    `Relay Transact Package V1 requires exactly ${String(RELAY_TRANSACT_SUPPORTED_SIGNAL_COUNT)} packed public signals.`,
  );
}

export function sliceSupportedPublicSignalFields(publicSignals: string): Buffer[] {
  assertSupportedPublicSignals(publicSignals);
  const bytes = decodePublicSignalBytes(publicSignals);
  const body = hasSupportedLengthPrefix(bytes)
    ? bytes.subarray(RELAY_TRANSACT_SIGNAL_PREFIX_BYTES)
    : bytes;
  return Array.from(
    { length: RELAY_TRANSACT_SUPPORTED_SIGNAL_COUNT },
    (_unused, index) =>
      Buffer.from(
        body.subarray(
          index * RELAY_TRANSACT_FIELD_BYTES,
          (index + 1) * RELAY_TRANSACT_FIELD_BYTES,
        ),
      ),
  );
}
