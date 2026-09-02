import { describe, expect, it } from 'vitest';
import { StrKey, xdr } from '@stellar/stellar-sdk';
import { parseEscrowOutputNoteEvent } from '../src/transact/escrow/parse-output-note-events.js';

const POOL = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const OTHER_POOL = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSD';
const COMMITMENT_HEX = 'aa'.repeat(32);
const EPHEMERAL_X_HEX = '11'.repeat(32);
const EPHEMERAL_Y_HEX = '22'.repeat(32);
const TAG_HEX = '33'.repeat(32);
const CIPHERTEXT_LIMB_HEX = 'cd'.repeat(32);
const CIPHERTEXT_LIMB_COUNT = 6;
const OUTPUT_INDEX = 1;

function scBytes(hex: string): xdr.ScVal {
  return xdr.ScVal.scvBytes(Buffer.from(hex, 'hex'));
}

function scSymbol(name: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(name);
}

function mapEntry(key: string, value: xdr.ScVal): xdr.ScMapEntry {
  return new xdr.ScMapEntry({ key: scSymbol(key), val: value });
}

function outputNoteEvent(): xdr.ContractEvent {
  const ciphertext = Buffer.concat(
    Array.from({ length: CIPHERTEXT_LIMB_COUNT }, () =>
      Buffer.from(CIPHERTEXT_LIMB_HEX, 'hex'),
    ),
  );
  const v0 = new xdr.ContractEventV0({
    topics: [scSymbol('audit'), scSymbol('output_note'), scBytes(COMMITMENT_HEX)],
    data: xdr.ScVal.scvMap([
      mapEntry('output_index', xdr.ScVal.scvU32(OUTPUT_INDEX)),
      mapEntry('ephemeral_x', scBytes(EPHEMERAL_X_HEX)),
      mapEntry('ephemeral_y', scBytes(EPHEMERAL_Y_HEX)),
      mapEntry('ciphertext', xdr.ScVal.scvBytes(ciphertext)),
      mapEntry('tag', scBytes(TAG_HEX)),
    ]),
  });
  return new xdr.ContractEvent({
    ext: new xdr.ExtensionPoint(0),
    contractId: StrKey.decodeContract(POOL),
    type: xdr.ContractEventType.contract(),
    body: new xdr.ContractEventBody(0, v0),
  });
}

describe('escrow output-note events', () => {
  it('parses ciphertext limbs from an audit/output_note contract event', () => {
    const parsed = parseEscrowOutputNoteEvent(outputNoteEvent(), POOL);
    expect(parsed).toEqual({
      outputIndex: OUTPUT_INDEX,
      commitmentHashHex: COMMITMENT_HEX,
      createdEphemeralKey: [EPHEMERAL_X_HEX, EPHEMERAL_Y_HEX],
      ciphertext: Array.from(
        { length: CIPHERTEXT_LIMB_COUNT },
        () => CIPHERTEXT_LIMB_HEX,
      ),
      tag: TAG_HEX,
    });
  });

  it('ignores output-note events from a different pool', () => {
    expect(parseEscrowOutputNoteEvent(outputNoteEvent(), OTHER_POOL)).toBeUndefined();
  });
});
