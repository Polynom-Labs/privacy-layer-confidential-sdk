import { assertPrivateRecordsNullifiersAvailable } from '../transact/transfer-source/index.js';
import type {
  StellarPreparedOperation,
  StellarPrivateRecord,
  StellarStorageAdapter,
  StellarTransactEngine,
  StellarTransferIntent,
  StellarWalletAdapter,
} from '../types.js';
import { buildTransferOutputRecords } from './transfer-output-records.js';
import { selectPrivateRecords, sumRecordAmounts } from './record-selection.js';

export type TransferPrepareDeps = {
  storage: StellarStorageAdapter;
  wallet: StellarWalletAdapter;
  engine: StellarTransactEngine;
  poolContract: string;
  checkNullifierSpent?: (input: {
    nullifier: string;
    walletPublicKey: string;
  }) => Promise<boolean>;
};

export async function prepareTransferOperation(
  intent: StellarTransferIntent,
  deps: TransferPrepareDeps,
): Promise<StellarPreparedOperation> {
  const spend = await resolvePrivateAddressSpend(intent, deps);
  const walletAddress = await deps.wallet.getAddress();
  const walletPublicKey = walletAddress.trim();
  const consumedTotal = sumRecordAmounts(spend.consumedRecords);
  const prepared: StellarPreparedOperation = {
    kind: 'transfer',
    intent,
    consumedRecords: spend.consumedRecords,
    outputRecords: buildTransferOutputRecords(intent, consumedTotal, walletPublicKey),
    submissionPayload: {
      operationId: crypto.randomUUID(),
      signed: false,
    },
    transactArtifacts: spend.transactArtifacts,
  };
  return deps.engine.prepare(prepared);
}

async function resolvePrivateAddressSpend(
  intent: StellarTransferIntent,
  deps: TransferPrepareDeps,
): Promise<{
  consumedRecords: StellarPrivateRecord[];
  transactArtifacts: NonNullable<StellarPreparedOperation['transactArtifacts']>;
}> {
  const walletAddress = await deps.wallet.getAddress();
  const walletPublicKey = walletAddress.trim();
  const consumedRecords = await selectPrivateRecords({
    storage: deps.storage,
    kind: 'transfer',
    intent,
    walletPublicKey,
    ...(deps.checkNullifierSpent
      ? { checkNullifierSpent: deps.checkNullifierSpent }
      : {}),
  });
  await assertPrivateRecordsNullifiersAvailable({
    records: consumedRecords,
    walletPublicKey: walletAddress.trim(),
    ...(deps.checkNullifierSpent
      ? { checkNullifierSpent: deps.checkNullifierSpent }
      : {}),
  });
  return {
    consumedRecords,
    transactArtifacts: {
      spendSource: 'privateAddress',
    },
  };
}
