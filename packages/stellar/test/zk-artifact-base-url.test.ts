import { describe, expect, it } from 'vitest';
import { optionalZkArtifactBaseUrl } from '../src/transact/zk/circuit-config.js';

describe('optionalZkArtifactBaseUrl', () => {
  it('omits empty values', () => {
    expect(optionalZkArtifactBaseUrl(undefined)).toEqual({});
    expect(optionalZkArtifactBaseUrl('  ')).toEqual({});
  });

  it('trims trailing slashes', () => {
    expect(optionalZkArtifactBaseUrl('/zk-artifacts/')).toEqual({
      zkArtifactBaseUrl: '/zk-artifacts',
    });
  });
});
