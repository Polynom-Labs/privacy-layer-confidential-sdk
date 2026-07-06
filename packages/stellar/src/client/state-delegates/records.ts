import type { StellarStateService } from '../../state/index.js';

export function createRecordsStateDelegates(state: StellarStateService) {
  return {
    getPrivateRecords: () => state.getPrivateRecords(),
    getAvailablePrivateRecords: (
      filter: Parameters<StellarStateService['getAvailablePrivateRecords']>[0],
    ) => state.getAvailablePrivateRecords(filter),
    getPrivateBalance: (
      input: Parameters<StellarStateService['getPrivateBalance']>[0],
    ) => state.getPrivateBalance(input),
    getPrivateAssetRows: (
      owner: Parameters<StellarStateService['getPrivateAssetRows']>[0],
    ) => state.getPrivateAssetRows(owner),
    upsertPrivateRecords: (
      records: Parameters<StellarStateService['upsertPrivateRecords']>[0],
    ) => state.upsertPrivateRecords(records),
    markPrivateRecordsStatus: (
      records: Parameters<StellarStateService['markPrivateRecordsStatus']>[0],
      status: Parameters<StellarStateService['markPrivateRecordsStatus']>[1],
    ) => state.markPrivateRecordsStatus(records, status),
    pruneConsumedPrivateRecords: () => state.pruneConsumedPrivateRecords(),
    getTransactionStatus: (
      txHash: Parameters<StellarStateService['getTransactionStatus']>[0],
    ) => state.getTransactionStatus(txHash),
    setTransactionStatus: (
      status: Parameters<StellarStateService['setTransactionStatus']>[0],
    ) => state.setTransactionStatus(status),
    clearTransactionStatus: (
      txHash: Parameters<StellarStateService['clearTransactionStatus']>[0],
    ) => state.clearTransactionStatus(txHash),
  };
}
