import type { StellarLeafEphemeral } from '../../../types.js';
import { normalizeLeafEphemeral } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

function isMissingStatePathError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes('Record path not found:') ||
    error.message.includes('JSONPath segment not found:')
  );
}

export function createPoolEphemeralService(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    async getLeafEphemeral(input: {
      poolContract: string;
      leafIndex: number;
    }): Promise<StellarLeafEphemeral | undefined> {
      try {
        const value = await bridge.read<unknown>({
          type: stellarStateCallTypes.readLeafEphemeral,
          poolContract: input.poolContract,
          leafIndex: input.leafIndex,
        });
        return normalizeLeafEphemeral(value);
      } catch (error) {
        if (isMissingStatePathError(error)) {
          return undefined;
        }
        throw error;
      }
    },

    setLeafEphemeral(ephemeral: StellarLeafEphemeral): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.setLeafEphemeral,
        ephemeral,
      });
    },
  };
}
