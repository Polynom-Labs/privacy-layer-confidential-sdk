export type EphemeralPointHex = { xHex: string; yHex: string };

const HEX_64_RE = /^[\da-f]{64}$/iu;

function normalizeCoordinate(value: string): string {
  const hex = value.trim().replace(/^0x/iu, '').toLowerCase();
  if (!HEX_64_RE.test(hex)) {
    throw new Error('Ephemeral key coordinate must be a 32-byte hex string.');
  }
  return hex;
}

export function serializeEphemeralKeyString(point: EphemeralPointHex): string {
  return `${normalizeCoordinate(point.xHex)}:${normalizeCoordinate(point.yHex)}`;
}
