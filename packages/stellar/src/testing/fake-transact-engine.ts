import type { StellarOperationReceipt, StellarTransactEngine } from '../types.js';

export function createFakeTransactEngine(
  overrides: Partial<StellarTransactEngine> = {},
): StellarTransactEngine {
  return {
    prepare: async (prepared) => prepared,
    submit: async (_prepared, signedPayload): Promise<StellarOperationReceipt> => ({
      operationId: signedPayload.operationId,
      confirmed: true,
    }),
    ...overrides,
  };
}
