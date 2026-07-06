import type { StellarTransactionConfirmationStatus } from '../state/domain/types.js';
import type { StellarRpcServer } from './server.js';
import { readStellarTransactionStatus } from './transactions.js';

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 60_000;

export async function waitForStellarTransactionConfirmation(input: {
  server: StellarRpcServer;
  txHash: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}): Promise<{
  txHash: string;
  status: StellarTransactionConfirmationStatus;
  ledger?: number;
  createdAt?: string;
}> {
  const pollIntervalMs = input.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await readStellarTransactionStatus(input.server, input.txHash);
    if ('kind' in status) {
      if (status.kind === 'failed') {
        throw new Error('Transaction failed on network');
      }
      if (status.kind === 'rpc_error') {
        throw new Error(status.message);
      }
    } else if (status.status === 'success') {
      return status;
    } else if (status.status === 'failed') {
      throw new Error('Transaction failed on network');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
  }
  throw new Error('Transaction was not confirmed in time');
}
