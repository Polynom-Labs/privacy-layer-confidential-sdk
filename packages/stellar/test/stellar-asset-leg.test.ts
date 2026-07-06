import { describe, expect, it } from 'vitest';
import {
  assetLegToTokenAddress,
  tokenAddressToAssetLeg,
} from '../src/transact/index.js';

const CONTRACT_ID = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

describe('Stellar asset leg encoding', () => {
  it('round-trips a Stellar contract id through asset legs', () => {
    const [assetHi, assetLo] = tokenAddressToAssetLeg(CONTRACT_ID);

    expect(assetLegToTokenAddress(assetHi, assetLo)).toBe(CONTRACT_ID);
  });
});
