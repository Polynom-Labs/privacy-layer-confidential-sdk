import { Api } from '@stellar/stellar-sdk/rpc';
import type { StellarTransactionConfirmationStatus } from '../state/domain/types.js';
import {
  extractInvokedPoolContractFromEnvelope,
  tryExtractTransferAmountRawFromMeta,
} from './soroban-transaction-meta.js';
import { parseStellarRpcUnixTimestampSeconds } from './stellar-rpc-unix-timestamp.js';
import type { StellarRpcServer } from './server.js';

export type StellarTransactionDetails = {
  txHash: string;
  status: StellarTransactionConfirmationStatus;
  ledger?: number;
  createdAt?: string;
  invokedPoolContractId?: string;
  transferAmountRaw?: string;
};

export type StellarTransactionFetchReject =
  | { kind: 'not_found'; message: string }
  | { kind: 'failed'; message: string }
  | { kind: 'rpc_error'; message: string };

function readCreatedAtSeconds(
  response: Api.GetTransactionResponse,
): number | undefined {
  const responseRecord = response as {
    createdAt?: unknown;
    created_at?: unknown;
  };
  return parseStellarRpcUnixTimestampSeconds(
    responseRecord.createdAt ?? responseRecord.created_at,
  );
}

function buildSuccessDetails(
  txHash: string,
  response: Api.GetSuccessfulTransactionResponse,
): StellarTransactionDetails {
  const invokedPoolContractId = extractInvokedPoolContractFromEnvelope(
    response.envelopeXdr,
  );
  const transferAmountRaw =
    invokedPoolContractId === undefined
      ? undefined
      : tryExtractTransferAmountRawFromMeta(
          response.resultMetaXdr,
          invokedPoolContractId,
        );
  const createdAtSeconds = readCreatedAtSeconds(response);
  return {
    txHash,
    status: 'success',
    ledger: response.ledger,
    ...(createdAtSeconds === undefined
      ? {}
      : { createdAt: new Date(createdAtSeconds * 1000).toISOString() }),
    ...(invokedPoolContractId === undefined ? {} : { invokedPoolContractId }),
    ...(transferAmountRaw === undefined ? {} : { transferAmountRaw }),
  };
}

export async function fetchStellarTransactionDetails(
  server: StellarRpcServer,
  txHash: string,
): Promise<StellarTransactionDetails | StellarTransactionFetchReject> {
  const trimmed = txHash.trim();
  if (!trimmed) {
    return { kind: 'rpc_error', message: 'Missing tx hash' };
  }
  let response: Api.GetTransactionResponse;
  try {
    response = await server.getTransaction(trimmed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Soroban request failed';
    return { kind: 'rpc_error', message };
  }
  if (response.status === Api.GetTransactionStatus.NOT_FOUND) {
    return { kind: 'not_found', message: 'Transaction not found' };
  }
  if (response.status === Api.GetTransactionStatus.FAILED) {
    return {
      txHash: trimmed,
      status: 'failed',
      ledger: response.ledger,
    };
  }
  return buildSuccessDetails(trimmed, response as Api.GetSuccessfulTransactionResponse);
}

function transactionDetailsToStatus(details: StellarTransactionDetails): {
  txHash: string;
  status: StellarTransactionConfirmationStatus;
  ledger?: number;
  createdAt?: string;
} {
  return {
    txHash: details.txHash,
    status: details.status,
    ...(details.ledger === undefined ? {} : { ledger: details.ledger }),
    ...(details.createdAt === undefined ? {} : { createdAt: details.createdAt }),
  };
}

export async function readStellarTransactionStatus(
  server: StellarRpcServer,
  txHash: string,
): Promise<
  | {
      txHash: string;
      status: StellarTransactionConfirmationStatus;
      ledger?: number;
      createdAt?: string;
    }
  | StellarTransactionFetchReject
> {
  const details = await fetchStellarTransactionDetails(server, txHash);
  if ('kind' in details) {
    return details;
  }
  return transactionDetailsToStatus(details);
}
