import { Buffer } from 'buffer';
import { DEFAULT_ZK_CONFIG_NONCE } from '../environment/zk-config-nonce.js';
import {
  RELAY_TRANSACT_FIELD_BYTES,
  RELAY_TRANSACT_SIGNAL_PREFIX_BYTES,
} from './constants.js';
import { relayLayoutProfileForNonce } from './layout-profile.js';

function decodePublicSignalBytes(publicSignals: string): Buffer {
  return Buffer.from(publicSignals.replace(/^0x/iu, ''), 'hex');
}

function hasSupportedLengthPrefix(bytes: Buffer, signalCount: number): boolean {
  const expected =
    RELAY_TRANSACT_SIGNAL_PREFIX_BYTES + signalCount * RELAY_TRANSACT_FIELD_BYTES;
  if (bytes.length !== expected) {
    return false;
  }
  return bytes.readUInt32BE(0) === signalCount;
}

export function assertSupportedPublicSignals(
  publicSignals: string,
  zkConfigNonce: bigint = DEFAULT_ZK_CONFIG_NONCE,
): void {
  const profile = relayLayoutProfileForNonce(zkConfigNonce);
  const bytes = decodePublicSignalBytes(publicSignals);
  const supportedBytes = profile.signalCount * RELAY_TRANSACT_FIELD_BYTES;
  if (
    bytes.length === supportedBytes ||
    hasSupportedLengthPrefix(bytes, profile.signalCount)
  ) {
    return;
  }
  throw new Error(
    `Relay Transact Package V1 requires exactly ${String(profile.signalCount)} packed public signals.`,
  );
}

export function sliceSupportedPublicSignalFields(
  publicSignals: string,
  zkConfigNonce: bigint = DEFAULT_ZK_CONFIG_NONCE,
): Buffer[] {
  assertSupportedPublicSignals(publicSignals, zkConfigNonce);
  const profile = relayLayoutProfileForNonce(zkConfigNonce);
  const bytes = decodePublicSignalBytes(publicSignals);
  const body = hasSupportedLengthPrefix(bytes, profile.signalCount)
    ? bytes.subarray(RELAY_TRANSACT_SIGNAL_PREFIX_BYTES)
    : bytes;
  return Array.from({ length: profile.signalCount }, (_unused, index) =>
    Buffer.from(
      body.subarray(
        index * RELAY_TRANSACT_FIELD_BYTES,
        (index + 1) * RELAY_TRANSACT_FIELD_BYTES,
      ),
    ),
  );
}
