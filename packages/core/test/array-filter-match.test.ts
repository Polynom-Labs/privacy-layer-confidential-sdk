import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  filterArrayByRejectMatch,
  registerArrayFilterItemSchema,
  shouldRejectArrayItem,
} from '../src/state/array-filter/match.js';

const recordSchema = z.object({
  id: z.string(),
  owner: z.string(),
  consumed: z.boolean(),
});

registerArrayFilterItemSchema('record', recordSchema);

describe('shouldRejectArrayItem', () => {
  it('rejects items matching fieldEquals', () => {
    expect(
      shouldRejectArrayItem(
        { id: '1', owner: 'G-OWNER', consumed: true },
        { op: 'fieldEquals', field: 'consumed', value: true },
      ),
    ).toBe(true);
  });

  it('rejects items matching fieldIn', () => {
    expect(
      shouldRejectArrayItem(
        { id: 'claim-a', owner: 'G-OWNER', consumed: false },
        { op: 'fieldIn', field: 'id', values: ['claim-a', 'claim-b'] },
      ),
    ).toBe(true);
  });

  it('rejects items matching all and matches', () => {
    expect(
      shouldRejectArrayItem(
        { id: '1', owner: 'G-OWNER', consumed: false },
        {
          op: 'and',
          matches: [
            { op: 'fieldEquals', field: 'owner', value: 'G-OWNER' },
            { op: 'fieldEquals', field: 'id', value: '1' },
          ],
        },
      ),
    ).toBe(true);
  });
});

describe('filterArrayByRejectMatch', () => {
  it('parses items with zod and removes rejected rows', () => {
    const filtered = filterArrayByRejectMatch(
      [
        { id: 'active', owner: 'G-OWNER', consumed: false },
        { id: 'used', owner: 'G-OWNER', consumed: true },
        { invalid: true },
      ],
      'record',
      { op: 'fieldEquals', field: 'consumed', value: true },
    );

    expect(filtered).toEqual([{ id: 'active', owner: 'G-OWNER', consumed: false }]);
  });
});
