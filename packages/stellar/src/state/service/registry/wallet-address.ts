import type { StellarStateServiceBase } from '../base.js';
import { createWalletRecordMethods } from './wallet-record-methods.js';
import { createWalletScalarMethods } from './wallet-scalar-methods.js';

export function createWalletAddressService(context: StellarStateServiceBase) {
  return {
    ...createWalletScalarMethods(context),
    ...createWalletRecordMethods(context),
  };
}
