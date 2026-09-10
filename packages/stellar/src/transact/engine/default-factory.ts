import { PrivacyPoolSDK } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import {
  configurePrivacyPoolService,
  createPrivacyPoolService,
  getPrivacyPoolService,
} from '../pool/singleton.js';
import { createBrowserStellarTransactEngine } from './browser-stellar.js';
import type {
  StellarBrowserAssets,
  StellarOperationReceipt,
  StellarPreparedOperation,
  StellarTransactEngine,
} from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import { resolveZkConfigNonce } from '../environment/zk-config-nonce.js';
import {
  materializeSelectedZkCircuit,
  optionalZkArtifactBaseUrl,
} from '../zk/circuit-config.js';

async function privacyPoolInitOptions(
  assets: StellarBrowserAssets,
  transactEnvironment?: StellarTransactEnvironment,
): Promise<Parameters<typeof PrivacyPoolSDK.init>[0]> {
  if (!transactEnvironment) {
    return { wasmBinary: assets.sdkWasm };
  }
  const zkConfigNonce = resolveZkConfigNonce(transactEnvironment);
  const zkCircuits = await materializeSelectedZkCircuit(
    transactEnvironment.zkCircuits,
    zkConfigNonce,
  );
  return {
    wasmBinary: assets.sdkWasm,
    zkCircuits,
    zkConfigNonce,
    ...optionalZkArtifactBaseUrl(transactEnvironment.zkArtifactBaseUrl),
  };
}

export async function createDefaultTransactEngine(
  assets: StellarBrowserAssets,
  transactEnvironment?: StellarTransactEnvironment,
): Promise<StellarTransactEngine> {
  await PrivacyPoolSDK.init(await privacyPoolInitOptions(assets, transactEnvironment));

  if (transactEnvironment) {
    configurePrivacyPoolService(
      createPrivacyPoolService({
        assets,
        applicationId: transactEnvironment.network.applicationId,
        ...(transactEnvironment.auditPublicKey
          ? { auditPublicKey: transactEnvironment.auditPublicKey }
          : {}),
        ...(transactEnvironment.zkCircuits
          ? { zkCircuits: transactEnvironment.zkCircuits }
          : {}),
        ...(transactEnvironment.zkConfigNonce === undefined
          ? {}
          : { zkConfigNonce: transactEnvironment.zkConfigNonce }),
        ...optionalZkArtifactBaseUrl(transactEnvironment.zkArtifactBaseUrl),
      }),
    );
    return createBrowserStellarTransactEngine({
      environment: transactEnvironment,
      poolService: getPrivacyPoolService(),
    });
  }

  return {
    prepare: async (prepared) => prepared,
    submit: async (_prepared, signedPayload): Promise<StellarOperationReceipt> => ({
      operationId: signedPayload.operationId,
      confirmed: signedPayload.signed,
    }),
  };
}

export function createStellarPolicyAdapterFromEnvironment(
  transactEnvironment: StellarTransactEnvironment,
) {
  return {
    inspectOperation: async (
      _kind: StellarPreparedOperation['kind'],
      _intent: StellarPreparedOperation['intent'],
    ) => {
      await Promise.resolve(transactEnvironment.network.applicationId);
    },
  };
}
