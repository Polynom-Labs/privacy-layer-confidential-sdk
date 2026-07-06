import { Buffer } from 'buffer';
import { commitmentsBuffersToDecimal } from './encoding.js';
import type {
  CachedPoolMerkleView,
  PoolMerkleStatePort,
  LeafEphemeralStatePort,
} from '../merkle/state-port.js';
import { poolMerkleStateToCachedView } from '../merkle/state-port.js';
import { readPoolClientFactory } from '../../contracts/contract-context.js';
import type { StellarTransactEnvironment } from '../environment/types.js';

export interface FetchContractMerkleResult {
  commitmentCount: number;
  commitments: string[];
  merkleRootHex: string;
  updatedAt: number;
}

function normalizeCommitmentBuffers(rawBuffers: Buffer[]): Buffer[] {
  return rawBuffers.map((bufferRow) =>
    Buffer.isBuffer(bufferRow) ? bufferRow : Buffer.from(bufferRow),
  );
}

function mergeContractMerkleWithCache(parameters: {
  poolContractId: string;
  contractCommitments: string[];
  contractCount: number;
  merkleRootHex: string;
  cachedState: CachedPoolMerkleView | undefined;
  poolMerkleState?: PoolMerkleStatePort;
}): FetchContractMerkleResult {
  const cachedCount = parameters.cachedState?.commitments.length ?? 0;
  const shouldPreferContract =
    parameters.contractCount > cachedCount ||
    !parameters.cachedState ||
    cachedCount === 0;
  if (shouldPreferContract) {
    const updatedAt = Date.now();
    void parameters.poolMerkleState?.set({
      poolContract: parameters.poolContractId,
      commitments: parameters.contractCommitments,
      commitmentCount: parameters.contractCount,
      merkleRootHex: parameters.merkleRootHex,
      updatedAt,
    });
    return {
      commitments: parameters.contractCommitments,
      updatedAt,
      merkleRootHex: parameters.merkleRootHex,
      commitmentCount: parameters.contractCount,
    };
  }
  return {
    commitments: parameters.cachedState!.commitments,
    updatedAt: parameters.cachedState!.updatedAt,
    merkleRootHex: parameters.cachedState!.merkleRootHex ?? parameters.merkleRootHex,
    commitmentCount: parameters.cachedState!.commitments.length,
  };
}

async function readCachedPoolMerkleView(
  poolMerkleState: PoolMerkleStatePort | undefined,
  poolContractId: string,
): Promise<CachedPoolMerkleView | undefined> {
  if (!poolMerkleState) {
    return undefined;
  }
  const cached = await poolMerkleState.get(poolContractId);
  return cached ? poolMerkleStateToCachedView(cached) : undefined;
}

export async function fetchAndMergeMerkleState(parameters: {
  poolContractId: string;
  walletPublicKey: string;
  transactEnvironment: StellarTransactEnvironment;
  poolMerkleState?: PoolMerkleStatePort;
}): Promise<FetchContractMerkleResult> {
  const client = readPoolClientFactory(parameters.transactEnvironment)({
    contractId: parameters.poolContractId,
    walletPublicKey: parameters.walletPublicKey,
    networkPassphrase: parameters.transactEnvironment.network.networkPassphrase,
    sorobanRpcUrl: parameters.transactEnvironment.network.rpcUrl,
  });

  const commitmentsRead = await client.get_commitments();
  const rawBuffers = commitmentsRead.result as Buffer[];
  const buffers = normalizeCommitmentBuffers(rawBuffers);
  const contractCommitments = commitmentsBuffersToDecimal(buffers);
  const contractCount = contractCommitments.length;

  const rootRead = await client.get_merkle_root();
  const merkleRootBuffer = rootRead.result as Buffer;
  const merkleRootHex = Buffer.from(merkleRootBuffer).toString('hex');

  const cachedState = await readCachedPoolMerkleView(
    parameters.poolMerkleState,
    parameters.poolContractId,
  );
  return mergeContractMerkleWithCache({
    poolContractId: parameters.poolContractId,
    contractCommitments,
    contractCount,
    merkleRootHex,
    cachedState,
    ...(parameters.poolMerkleState
      ? { poolMerkleState: parameters.poolMerkleState }
      : {}),
  });
}

export async function readLeafEphemeralHex(parameters: {
  poolContractId: string;
  walletPublicKey: string;
  leafIndex: number;
  transactEnvironment: StellarTransactEnvironment;
  leafEphemeral?: LeafEphemeralStatePort;
}): Promise<{ xHex: string; yHex: string }> {
  const cached = await parameters.leafEphemeral?.get({
    poolContract: parameters.poolContractId,
    leafIndex: parameters.leafIndex,
  });
  if (cached?.xHex && cached.yHex) {
    return { xHex: cached.xHex, yHex: cached.yHex };
  }
  const client = readPoolClientFactory(parameters.transactEnvironment)({
    contractId: parameters.poolContractId,
    walletPublicKey: parameters.walletPublicKey,
    networkPassphrase: parameters.transactEnvironment.network.networkPassphrase,
    sorobanRpcUrl: parameters.transactEnvironment.network.rpcUrl,
  });
  const read = await client.get_leaf_ephemeral({ leaf_index: parameters.leafIndex });
  const coords = read.result;
  if (!coords?.x || !coords?.y) {
    throw new Error('Missing leaf ephemeral key on contract');
  }
  const xHex = Buffer.from(coords.x).toString('hex');
  const yHex = Buffer.from(coords.y).toString('hex');
  await parameters.leafEphemeral?.set({
    poolContract: parameters.poolContractId,
    leafIndex: parameters.leafIndex,
    xHex,
    yHex,
    cachedAt: new Date().toISOString(),
  });
  return { xHex, yHex };
}
