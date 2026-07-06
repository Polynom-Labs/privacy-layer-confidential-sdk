import type {
  StellarAddress,
  StellarWalletPrivateAddressScalar,
} from '../../../types.js';
import { normalizeWalletPrivateAddressScalar } from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createWalletScalarMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    async getWalletPrivateAddressScalar(input: {
      owner: StellarAddress;
      nonce: string;
    }): Promise<StellarWalletPrivateAddressScalar | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readWalletPrivateAddressScalar,
        owner: input.owner,
        nonce: input.nonce,
      });
      return normalizeWalletPrivateAddressScalar(value);
    },

    saveWalletPrivateAddressScalar(
      scalar: StellarWalletPrivateAddressScalar,
    ): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.saveWalletPrivateAddressScalar,
        scalar,
      });
    },

    deleteWalletPrivateAddressScalar(input: {
      owner: StellarAddress;
      nonce: string;
    }): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.deleteWalletPrivateAddressScalar,
        owner: input.owner,
        nonce: input.nonce,
      });
    },
  };
}
