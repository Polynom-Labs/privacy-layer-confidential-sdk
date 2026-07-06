import { PrivacyPoolSDK } from '@auditable/privacy-pool-zk-sdk';
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

export async function createDefaultTransactEngine(
  assets: StellarBrowserAssets,
  transactEnvironment?: StellarTransactEnvironment,
): Promise<StellarTransactEngine> {
  await PrivacyPoolSDK.init({
    wasmBinary: assets.sdkWasm,
    circuitWasm: assets.circuitWasm,
    zkey: assets.provingKey,
  });

  if (transactEnvironment) {
    configurePrivacyPoolService(
      createPrivacyPoolService({
        assets,
        applicationId: transactEnvironment.network.applicationId,
        ...(transactEnvironment.auditPublicKey
          ? { auditPublicKey: transactEnvironment.auditPublicKey }
          : {}),
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
