import {
  BundledZkCircuit,
  type BundledZkCircuitConfig,
  type DevZkCircuitConfig,
  type ZkCircuitConfig,
  type ZkCircuitLayoutFields,
} from '@arcanetech/stellar-privacy-pool-zk-sdk';
import {
  BINDING_ZK_NONCE,
  SIX_BY_SIX_BINDING_ZK_NONCE,
} from '../environment/zk-config-nonce.js';

export { BundledZkCircuit } from '@arcanetech/stellar-privacy-pool-zk-sdk';

export type StellarBundledZkCircuitDefinition = ZkCircuitLayoutFields & {
  circuit: BundledZkCircuit;
};

export type StellarCustomZkCircuitDefinition = ZkCircuitLayoutFields & {
  zkeyUrl: string;
  circuitGraphUrl: string;
  r1csUrl: string;
  provingKeyUrl: string;
};

export type StellarZkCircuitDefinition =
  StellarBundledZkCircuitDefinition | StellarCustomZkCircuitDefinition;

export const DEFAULT_STELLAR_ZK_CIRCUITS: Record<
  string,
  StellarBundledZkCircuitDefinition
> = {
  [BINDING_ZK_NONCE.toString()]: {
    nIns: 2,
    nOuts: 2,
    publicNInputs: 1,
    publicNOutputs: 1,
    circuit: BundledZkCircuit.TwoByTwo,
  },
  [SIX_BY_SIX_BINDING_ZK_NONCE.toString()]: {
    nIns: 6,
    nOuts: 6,
    publicNInputs: 1,
    publicNOutputs: 1,
    circuit: BundledZkCircuit.SixBySix,
  },
};

function isBundledDefinition(
  definition: StellarZkCircuitDefinition,
): definition is StellarBundledZkCircuitDefinition {
  return 'circuit' in definition;
}

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ZK artifact ${url}: ${String(response.status)}`);
  }
  return response.arrayBuffer();
}

async function materializeDefinition(
  definition: StellarZkCircuitDefinition,
): Promise<ZkCircuitConfig> {
  if (isBundledDefinition(definition)) {
    const bundled: BundledZkCircuitConfig = {
      nIns: definition.nIns,
      nOuts: definition.nOuts,
      publicNInputs: definition.publicNInputs,
      publicNOutputs: definition.publicNOutputs,
      circuit: definition.circuit,
    };
    return bundled;
  }
  const [zkey, circuitGraph, r1cs, provingKey] = await Promise.all([
    fetchBuffer(definition.zkeyUrl),
    fetchBuffer(definition.circuitGraphUrl),
    fetchBuffer(definition.r1csUrl),
    fetchBuffer(definition.provingKeyUrl),
  ]);
  const custom: DevZkCircuitConfig = {
    nIns: definition.nIns,
    nOuts: definition.nOuts,
    publicNInputs: definition.publicNInputs,
    publicNOutputs: definition.publicNOutputs,
    zkey,
    circuitGraph,
    r1cs,
    provingKey,
  };
  return custom;
}

export async function materializeSelectedZkCircuit(
  circuits: Record<string, StellarZkCircuitDefinition> | undefined,
  nonce: bigint,
): Promise<Record<string, ZkCircuitConfig>> {
  const map = stellarCircuitsOrDefault(circuits);
  const key = nonce.toString();
  const definition = Object.entries(map).find(([nonceKey]) => nonceKey === key)?.[1];
  if (!definition) {
    throw new Error(`no zk circuit configured for nonce ${key}`);
  }
  return { [key]: await materializeDefinition(definition) };
}

function stellarCircuitsOrDefault(
  circuits: Record<string, StellarZkCircuitDefinition> | undefined,
): Record<string, StellarZkCircuitDefinition> {
  return circuits ?? DEFAULT_STELLAR_ZK_CIRCUITS;
}

export function optionalZkArtifactBaseUrl(value: string | undefined): {
  zkArtifactBaseUrl?: string;
} {
  if (value === undefined) {
    return {};
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return {};
  }
  let withoutSlash = trimmed;
  while (withoutSlash.endsWith('/')) {
    withoutSlash = withoutSlash.slice(0, -1);
  }
  return { zkArtifactBaseUrl: withoutSlash };
}
