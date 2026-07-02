import { PrivacyPoolSDK } from '@auditable/privacy-pool-zk-sdk';
import type {
  StellarBrowserAssets,
  StellarOperationReceipt,
  StellarTransactEngine,
} from './types.js';

export async function createDefaultTransactEngine(
  assets: StellarBrowserAssets,
): Promise<StellarTransactEngine> {
  await PrivacyPoolSDK.init({
    wasmBinary: assets.sdkWasm,
    circuitWasm: assets.circuitWasm,
    zkey: assets.provingKey,
  });

  return {
    prepare: async (prepared) => prepared,
    submit: async (_prepared, signedPayload): Promise<StellarOperationReceipt> => ({
      operationId: signedPayload.operationId,
      confirmed: signedPayload.signed,
    }),
  };
}
