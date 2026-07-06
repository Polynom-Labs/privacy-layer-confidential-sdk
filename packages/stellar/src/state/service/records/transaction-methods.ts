import type { StellarTransactionStatus } from '../../../types.js';
import { normalizeTransactionStatus } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createTransactionRecordMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    async getTransactionStatus(
      txHash: string,
    ): Promise<StellarTransactionStatus | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readTransactionStatus,
        txHash,
      });
      return normalizeTransactionStatus(value);
    },

    setTransactionStatus(status: StellarTransactionStatus): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.setTransactionStatus,
        status,
      });
    },

    clearTransactionStatus(txHash: string): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.clearTransactionStatus,
        txHash,
      });
    },
  };
}
