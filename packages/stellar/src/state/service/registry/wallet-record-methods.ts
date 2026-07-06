import type {
  StellarAddress,
  StellarWalletPrivateAddressRecord,
} from '../../../types.js';
import {
  normalizeWalletDefaultPrivateAddressNonce,
  normalizeWalletPrivateAddressRecord,
} from '../../read/normalize.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createWalletRecordMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    async getWalletPrivateAddressRecord(input: {
      owner: StellarAddress;
      nonce: string;
    }): Promise<StellarWalletPrivateAddressRecord | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readWalletPrivateAddressRecord,
        owner: input.owner,
        nonce: input.nonce,
      });
      return normalizeWalletPrivateAddressRecord(value);
    },

    saveWalletPrivateAddressRecord(
      record: StellarWalletPrivateAddressRecord,
    ): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.saveWalletPrivateAddressRecord,
        record,
      });
    },

    async getWalletDefaultPrivateAddressNonce(
      owner: StellarAddress,
    ): Promise<string | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readWalletDefaultPrivateAddressNonce,
        owner,
      });
      return normalizeWalletDefaultPrivateAddressNonce(value);
    },

    setWalletDefaultPrivateAddressNonce(input: {
      owner: StellarAddress;
      nonce: string;
    }): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.setWalletDefaultPrivateAddressNonce,
        owner: input.owner,
        nonce: input.nonce,
      });
    },
  };
}
