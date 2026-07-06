import type { StellarStateServiceBase } from '../base.js';
import { createPrivateRecordMethods } from './private-methods.js';
import { createTransactionRecordMethods } from './transaction-methods.js';

export function createRecordsService(context: StellarStateServiceBase) {
  return {
    ...createPrivateRecordMethods(context),
    ...createTransactionRecordMethods(context),
  };
}
