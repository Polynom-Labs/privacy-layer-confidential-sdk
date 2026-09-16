import { describe, expect, it } from 'vitest';
import { Buffer } from 'buffer';
import { xdr } from '@stellar/stellar-sdk';
import { commitmentBufferToDecimal } from '../src/transact/merkle/encoding.js';
import { readTreeLeafCommitments } from '../src/transact/merkle/read-tree-leaves.js';

const POOL = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const LEDGER_BATCH_SIZE = 100;

function leafBytes(seed: number): Buffer {
  return Buffer.alloc(32, seed);
}

function treeLeafKeyScValue(leafIndex: number): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Leaf'), xdr.ScVal.scvU32(leafIndex)]);
}

function fakeEntry(leafIndex: number, bytes: Buffer) {
  const key = treeLeafKeyScValue(leafIndex);
  const value = xdr.ScVal.scvBytes(bytes);
  return {
    val: {
      contractData: () => ({
        key: () => key,
        val: () => value,
      }),
    },
  };
}

describe('readTreeLeafCommitments', () => {
  it('returns an empty list when the range is empty', async () => {
    await expect(
      readTreeLeafCommitments({
        reader: {
          getLedgerEntries: async () => ({ entries: [] }),
        },
        contractId: POOL,
        startIndex: 3,
        endIndex: 3,
      }),
    ).resolves.toEqual([]);
  });

  it('returns Fr-decimal commitments in index order', async () => {
    const first = leafBytes(1);
    const second = leafBytes(2);
    const result = await readTreeLeafCommitments({
      reader: {
        getLedgerEntries: async () => ({
          entries: [fakeEntry(1, second), fakeEntry(0, first)],
        }),
      },
      contractId: POOL,
      startIndex: 0,
      endIndex: 2,
    });
    expect(result).toEqual([
      commitmentBufferToDecimal(first),
      commitmentBufferToDecimal(second),
    ]);
  });

  it('throws when a requested leaf is missing from storage', async () => {
    await expect(
      readTreeLeafCommitments({
        reader: {
          getLedgerEntries: async () => ({
            entries: [fakeEntry(0, leafBytes(1))],
          }),
        },
        contractId: POOL,
        startIndex: 0,
        endIndex: 2,
      }),
    ).rejects.toThrow(/Missing Merkle leaf 1/u);
  });

  it('batches ledger reads for large ranges', async () => {
    const requestedSizes: number[] = [];
    const endIndex = LEDGER_BATCH_SIZE + 3;
    await readTreeLeafCommitments({
      reader: {
        getLedgerEntries: async (...keys) => {
          requestedSizes.push(keys.length);
          return {
            entries: keys.map((_key, offset) => {
              const startIndex = requestedSizes.length === 1 ? 0 : LEDGER_BATCH_SIZE;
              return fakeEntry(startIndex + offset, leafBytes(1));
            }),
          };
        },
      },
      contractId: POOL,
      startIndex: 0,
      endIndex,
    });
    expect(requestedSizes).toEqual([LEDGER_BATCH_SIZE, 3]);
  });
});
