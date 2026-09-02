import { StrKey, xdr } from '@stellar/stellar-sdk';
import type { EscrowOutputNoteCiphertextEvent } from './reconstruct-escrow-note.js';

const FIELD_BYTE_LENGTH = 32;
const FIELD_HEX_LENGTH = 64;
const CONTRACT_EVENT_BODY_V0 = 0;
const OUTPUT_NOTE_TOPIC_COUNT = 3;

function extractSymbol(value: xdr.ScVal): string | undefined {
  try {
    if (value.switch().name === 'scvSymbol') {
      return value.sym().toString();
    }
    if (value.switch().name === 'scvString') {
      return value.str().toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function readBytes(value: xdr.ScVal | undefined): Buffer | undefined {
  if (!value) {
    return undefined;
  }
  try {
    if (value.switch().name !== 'scvBytes') {
      return undefined;
    }
    return Buffer.from(value.bytes());
  } catch {
    return undefined;
  }
}

function readU32(value: xdr.ScVal | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  try {
    if (value.switch().name !== 'scvU32') {
      return undefined;
    }
    return value.u32();
  } catch {
    return undefined;
  }
}

function fieldHex(bytes: Buffer): string {
  return bytes.toString('hex').padStart(FIELD_HEX_LENGTH, '0');
}

function ciphertextLimbs(bytes: Buffer): string[] {
  if (bytes.length === 0 || bytes.length % FIELD_BYTE_LENGTH !== 0) {
    return [];
  }
  const limbs: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += FIELD_BYTE_LENGTH) {
    limbs.push(fieldHex(bytes.subarray(offset, offset + FIELD_BYTE_LENGTH)));
  }
  return limbs;
}

function payloadMap(data: xdr.ScVal): Map<string, xdr.ScVal> {
  const entries = new Map<string, xdr.ScVal>();
  try {
    if (data.switch().name !== 'scvMap') {
      return entries;
    }
    const mapped = data.map();
    if (!mapped) {
      return entries;
    }
    for (const entry of mapped) {
      const key = extractSymbol(entry.key());
      if (key) {
        entries.set(key, entry.val());
      }
    }
  } catch {
    return entries;
  }
  return entries;
}

function hashToBuffer(value: unknown): Buffer | undefined {
  return Buffer.isBuffer(value) ? value : undefined;
}

function eventContractId(event: xdr.ContractEvent): string | undefined {
  try {
    const contractId = hashToBuffer(event.contractId());
    if (!contractId) {
      return undefined;
    }
    return StrKey.encodeContract(contractId);
  } catch {
    return undefined;
  }
}

function eventMatchesPool(event: xdr.ContractEvent, poolAddress: string): boolean {
  const contractId = eventContractId(event);
  return contractId === undefined || contractId === poolAddress.trim();
}

function outputNoteEventBody(
  event: xdr.ContractEvent,
): xdr.ContractEventV0 | undefined {
  if (event.type().name !== 'contract') {
    return undefined;
  }
  const body = event.body();
  if (body.switch() !== CONTRACT_EVENT_BODY_V0) {
    return undefined;
  }
  return body.v0();
}

function outputNoteFromPayload(
  topics: xdr.ScVal[],
  payload: Map<string, xdr.ScVal>,
): EscrowOutputNoteCiphertextEvent | undefined {
  const commitment = readBytes(topics[2]);
  const outputIndex = readU32(payload.get('output_index'));
  const ephemeralX = readBytes(payload.get('ephemeral_x'));
  const ephemeralY = readBytes(payload.get('ephemeral_y'));
  const ciphertextBytes = readBytes(payload.get('ciphertext'));
  const tag = readBytes(payload.get('tag'));
  const ciphertext = ciphertextBytes ? ciphertextLimbs(ciphertextBytes) : [];
  if (
    !commitment ||
    outputIndex === undefined ||
    !ephemeralX ||
    !ephemeralY ||
    ciphertext.length === 0 ||
    !tag
  ) {
    return undefined;
  }
  return {
    outputIndex,
    commitmentHashHex: fieldHex(commitment),
    createdEphemeralKey: [fieldHex(ephemeralX), fieldHex(ephemeralY)],
    ciphertext,
    tag: fieldHex(tag),
  };
}

export function parseEscrowOutputNoteEvent(
  event: xdr.ContractEvent,
  poolAddress: string,
): EscrowOutputNoteCiphertextEvent | undefined {
  if (!eventMatchesPool(event, poolAddress)) {
    return undefined;
  }
  const v0 = outputNoteEventBody(event);
  const topics = v0?.topics();
  if (!v0 || !Array.isArray(topics) || topics.length < OUTPUT_NOTE_TOPIC_COUNT) {
    return undefined;
  }
  if (
    extractSymbol(topics[0]!) !== 'audit' ||
    extractSymbol(topics[1]!) !== 'output_note'
  ) {
    return undefined;
  }
  return outputNoteFromPayload(topics, payloadMap(v0.data()));
}
