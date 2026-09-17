import { PrivacyPoolSDK } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import type { StellarBrowserAssets } from '../../types.js';
import { DEFAULT_ZK_CONFIG_NONCE } from '../environment/zk-config-nonce.js';
import {
  materializeSelectedZkCircuit,
  optionalZkArtifactBaseUrl,
  type StellarZkCircuitDefinition,
} from '../zk/circuit-config.js';

export type PrivacyPoolSdkInitInput = {
  assets: StellarBrowserAssets;
  zkCircuits?: Record<string, StellarZkCircuitDefinition>;
  zkConfigNonce?: bigint;
  zkArtifactBaseUrl?: string;
};

export async function initializePrivacyPoolSdk(
  input: PrivacyPoolSdkInitInput,
  nonce?: bigint,
): Promise<PrivacyPoolSDK> {
  const zkConfigNonce = nonce ?? input.zkConfigNonce ?? DEFAULT_ZK_CONFIG_NONCE;
  const zkCircuits = await materializeSelectedZkCircuit(
    input.zkCircuits,
    zkConfigNonce,
    input.zkArtifactBaseUrl,
  );
  return PrivacyPoolSDK.init({
    wasmBinary: input.assets.sdkWasm,
    zkCircuits,
    zkConfigNonce,
    ...optionalZkArtifactBaseUrl(input.zkArtifactBaseUrl),
  });
}
