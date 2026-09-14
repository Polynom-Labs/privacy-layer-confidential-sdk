import {
  bundledCircuitFileNames,
  defaultZkArtifactBaseUrl,
  type DevZkCircuitConfig,
} from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { fetchArrayBufferWithBrowserCache } from './browser-artifact-cache.js';
import type { StellarBundledZkCircuitDefinition } from './circuit-config.js';

function resolveArtifactBaseUrl(explicit?: string): string {
  const trimmed = explicit?.trim();
  if (trimmed === undefined || trimmed === '') {
    return defaultZkArtifactBaseUrl();
  }
  let withoutSlash = trimmed;
  while (withoutSlash.endsWith('/')) {
    withoutSlash = withoutSlash.slice(0, -1);
  }
  return withoutSlash;
}

function artifactHref(base: string, fileName: string): string {
  const withSlash = `${base}/`;
  if (/^https?:\/\//i.test(withSlash) || withSlash.startsWith('file:')) {
    return new URL(fileName, withSlash).href;
  }
  const href = (globalThis as { location?: { href: string } }).location?.href;
  if (href !== undefined) {
    return new URL(fileName, new URL(withSlash, href)).href;
  }
  return `${withSlash}${fileName}`;
}

export async function materializeBundledCircuitWithBrowserCache(
  definition: StellarBundledZkCircuitDefinition,
  zkArtifactBaseUrl?: string,
): Promise<DevZkCircuitConfig> {
  const base = resolveArtifactBaseUrl(zkArtifactBaseUrl);
  const names = bundledCircuitFileNames(definition.circuit);
  const [circuitGraph, r1cs, provingKey] = await Promise.all([
    fetchArrayBufferWithBrowserCache(artifactHref(base, names.graphFileName)),
    fetchArrayBufferWithBrowserCache(artifactHref(base, names.r1csFileName)),
    fetchArrayBufferWithBrowserCache(artifactHref(base, names.provingKeyFileName)),
  ]);
  return {
    nIns: definition.nIns,
    nOuts: definition.nOuts,
    publicNInputs: definition.publicNInputs,
    publicNOutputs: definition.publicNOutputs,
    circuitGraph,
    r1cs,
    provingKey,
  };
}
