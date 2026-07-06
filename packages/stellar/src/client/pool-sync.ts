import {
  fetchAndMergeMerkleState,
  readLeafEphemeralHex,
  type FetchContractMerkleResult,
} from '../transact/merkle/fetch-contract.js';
import type { StellarTransactEnvironment } from '../transact/environment/types.js';

function requireTransactEnvironment(
  transactEnvironment: StellarTransactEnvironment | undefined,
): StellarTransactEnvironment {
  if (!transactEnvironment) {
    throw new Error('Pool Merkle sync requires a configured transact environment.');
  }
  return transactEnvironment;
}

export async function syncPoolMerkleStateWithEnvironment(
  transactEnvironment: StellarTransactEnvironment | undefined,
  input: {
    poolContractId: string;
    walletPublicKey: string;
  },
): Promise<FetchContractMerkleResult> {
  const environment = requireTransactEnvironment(transactEnvironment);
  return fetchAndMergeMerkleState({
    poolContractId: input.poolContractId,
    walletPublicKey: input.walletPublicKey,
    transactEnvironment: environment,
    ...(environment.poolMerkleState
      ? { poolMerkleState: environment.poolMerkleState }
      : {}),
  });
}

export async function syncPoolMerkleStatesWithEnvironment(
  transactEnvironment: StellarTransactEnvironment | undefined,
  input: {
    poolContractIds: string[];
    walletPublicKey: string;
  },
): Promise<void> {
  const uniquePoolIds = [
    ...new Set(input.poolContractIds.map((id) => id.trim()).filter(Boolean)),
  ];
  for (const poolContractId of uniquePoolIds) {
    await syncPoolMerkleStateWithEnvironment(transactEnvironment, {
      poolContractId,
      walletPublicKey: input.walletPublicKey,
    });
  }
}

export async function readPoolLeafEphemeralHexWithEnvironment(
  transactEnvironment: StellarTransactEnvironment | undefined,
  input: {
    poolContractId: string;
    walletPublicKey: string;
    leafIndex: number;
  },
): Promise<{ xHex: string; yHex: string }> {
  const environment = requireTransactEnvironment(transactEnvironment);
  return readLeafEphemeralHex({
    poolContractId: input.poolContractId,
    walletPublicKey: input.walletPublicKey,
    leafIndex: input.leafIndex,
    transactEnvironment: environment,
    ...(environment.leafEphemeral ? { leafEphemeral: environment.leafEphemeral } : {}),
  });
}
