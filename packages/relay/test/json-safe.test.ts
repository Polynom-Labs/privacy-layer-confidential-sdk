import { describe, expect, it } from 'vitest';
import { jsonSafeClone } from '../src/index.js';

const NOTE_STROOPS = 4_000_000n;

describe('jsonSafeClone', () => {
  it('stringifies bigint note values so relay JSON stays valid', () => {
    const cloned = jsonSafeClone({
      owner: 'GABC',
      notes: { notes: [{ value: NOTE_STROOPS }] },
      temp_public_key_x: new Uint8Array([1, 2]),
    });
    expect(cloned).toEqual({
      owner: 'GABC',
      notes: { notes: [{ value: NOTE_STROOPS.toString() }] },
      temp_public_key_x: { type: 'Buffer', data: [1, 2] },
    });
    expect(() => JSON.stringify(cloned)).not.toThrow();
  });
});
