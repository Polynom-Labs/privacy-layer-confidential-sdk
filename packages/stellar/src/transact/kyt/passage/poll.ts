import { rpc } from '@stellar/stellar-sdk';

const KYT_REGISTER_MAX_POLLS = 60;
const KYT_REGISTER_POLL_INTERVAL_MS = 1000;

type LatestLedgerRpcResponse = {
  result?: {
    sequence?: number | string;
    latestLedger?: number | string;
  };
  error?: {
    message?: string;
  };
};

function parseLedgerSequence(value: number | string | undefined): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return undefined;
}

export async function fetchCurrentLedger(sorobanRpcUrl: string): Promise<number> {
  const response = await fetch(sorobanRpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestLedger',
    }),
  });
  const body = (await response.json()) as LatestLedgerRpcResponse;
  if (!response.ok || body.error) {
    const details = body.error?.message ?? response.statusText;
    throw new Error(`Failed to fetch current ledger from Soroban RPC: ${details}`);
  }
  const sequence =
    parseLedgerSequence(body.result?.sequence) ??
    parseLedgerSequence(body.result?.latestLedger);
  if (sequence === undefined) {
    throw new Error('Failed to fetch current ledger from Soroban RPC: invalid payload');
  }
  return sequence;
}

export async function waitForKytRegistration(parameters: {
  server: rpc.Server;
  hash: string;
}): Promise<void> {
  for (let attempt = 0; attempt < KYT_REGISTER_MAX_POLLS; attempt += 1) {
    const response = await parameters.server.getTransaction(parameters.hash);
    if (response.status === 'SUCCESS') {
      return;
    }
    if (response.status === 'FAILED') {
      throw new Error('KYT passage registration failed on-chain');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, KYT_REGISTER_POLL_INTERVAL_MS);
    });
  }
  throw new Error('KYT passage registration was not confirmed in time');
}
