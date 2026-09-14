import { describe, expect, it } from 'vitest';
import { resolvePoolApplicationId } from '../src/transact/audit/parameters.js';

describe('resolvePoolApplicationId', () => {
  it('accepts a decimal audit id', () => {
    expect(resolvePoolApplicationId('3520878299009890')).toBe('3520878299009890');
  });

  it('rejects a UUID used in place of association.audit_id', () => {
    expect(() =>
      resolvePoolApplicationId('b7f25daa-aeff-4f93-b33e-0cd905f0bab9'),
    ).toThrow(/decimal Fr/);
  });
});
