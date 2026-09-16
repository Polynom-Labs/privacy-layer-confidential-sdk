import { Address, xdr } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import { commitmentBufferToDecimal } from './encoding.js';

const TREE_LEAF_LEDGER_BATCH_SIZE = 100;

type TreeLeafLedgerReader = {
  getLedgerEntries: (
    ...keys: xdr.LedgerKey[]
  ) => Promise<{ entries: readonly TreeLeafLedgerEntry[] }>;
};

type TreeLeafLedgerEntry = {
  val: {
    contractData: () => {
      key: () => xdr.ScVal;
      val: () => xdr.ScVal;
    };
  };
};

function treeLeafLedgerKey(contractId: string, leafIndex: number): xdr.LedgerKey {
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: treeLeafKeyScValue(leafIndex),
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
}

function treeLeafKeyScValue(leafIndex: number): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Leaf'), xdr.ScVal.scvU32(leafIndex)]);
}

function leafIndexFromContractDataKey(key: xdr.ScVal): number | undefined {
  if (key.switch() !== xdr.ScValType.scvVec()) {
    return undefined;
  }
  const fields = key.vec();
  if (!fields || fields.length !== 2) {
    return undefined;
  }
  const [tag, indexValue] = fields;
  if (!tag || tag.switch() !== xdr.ScValType.scvSymbol()) {
    return undefined;
  }
  if (tag.sym().toString() !== 'Leaf') {
    return undefined;
  }
  if (!indexValue || indexValue.switch() !== xdr.ScValType.scvU32()) {
    return undefined;
  }
  return indexValue.u32();
}

function commitmentBytesFromContractDataValue(value: xdr.ScVal): Buffer | undefined {
  if (value.switch() !== xdr.ScValType.scvBytes()) {
    return undefined;
  }
  return Buffer.from(value.bytes());
}

export async function readTreeLeafCommitments(input: {
  reader: TreeLeafLedgerReader;
  contractId: string;
  startIndex: number;
  endIndex: number;
}): Promise<string[]> {
  if (input.startIndex >= input.endIndex) {
    return [];
  }
  const byIndex = await readLeafBuffersByIndex(input);
  return decimalCommitmentsInRange(byIndex, input.startIndex, input.endIndex);
}

async function readLeafBuffersByIndex(input: {
  reader: TreeLeafLedgerReader;
  contractId: string;
  startIndex: number;
  endIndex: number;
}): Promise<Map<number, Buffer>> {
  const keys = ledgerKeysForRange(input.contractId, input.startIndex, input.endIndex);
  const byIndex = new Map<number, Buffer>();
  for (const batch of chunkLedgerKeys(keys, TREE_LEAF_LEDGER_BATCH_SIZE)) {
    const response = await input.reader.getLedgerEntries(...batch);
    collectLeafBuffers(response.entries, byIndex);
  }
  return byIndex;
}

function ledgerKeysForRange(
  contractId: string,
  startIndex: number,
  endIndex: number,
): xdr.LedgerKey[] {
  const keys: xdr.LedgerKey[] = [];
  for (let leafIndex = startIndex; leafIndex < endIndex; leafIndex += 1) {
    keys.push(treeLeafLedgerKey(contractId, leafIndex));
  }
  return keys;
}

function chunkLedgerKeys(keys: xdr.LedgerKey[], batchSize: number): xdr.LedgerKey[][] {
  const batches: xdr.LedgerKey[][] = [];
  for (let offset = 0; offset < keys.length; offset += batchSize) {
    batches.push(keys.slice(offset, offset + batchSize));
  }
  return batches;
}

function collectLeafBuffers(
  entries: readonly TreeLeafLedgerEntry[],
  byIndex: Map<number, Buffer>,
): void {
  for (const entry of entries) {
    const contractData = entry.val.contractData();
    const leafIndex = leafIndexFromContractDataKey(contractData.key());
    const bytes = commitmentBytesFromContractDataValue(contractData.val());
    if (leafIndex === undefined || !bytes) {
      continue;
    }
    byIndex.set(leafIndex, bytes);
  }
}

function decimalCommitmentsInRange(
  byIndex: Map<number, Buffer>,
  startIndex: number,
  endIndex: number,
): string[] {
  const commitments: string[] = [];
  for (let leafIndex = startIndex; leafIndex < endIndex; leafIndex += 1) {
    const bytes = byIndex.get(leafIndex);
    if (!bytes) {
      throw new Error(`Missing Merkle leaf ${String(leafIndex)} in pool storage.`);
    }
    commitments.push(commitmentBufferToDecimal(bytes));
  }
  return commitments;
}
