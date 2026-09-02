import { Api } from '@stellar/stellar-sdk/rpc';
import { collectContractEventsFromMeta } from '../../rpc/soroban-transaction-meta.js';
import { createStellarRpcServer } from '../../rpc/server.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import { parseEscrowOutputNoteEvent } from './parse-output-note-events.js';
import type { EscrowOutputNoteCiphertextEvent } from './reconstruct-escrow-note.js';

export async function fetchEscrowOutputNoteEvents(input: {
  transactEnvironment: StellarTransactEnvironment;
  txId: string;
  poolAddress: string;
}): Promise<EscrowOutputNoteCiphertextEvent[]> {
  const txId = input.txId.trim();
  if (!txId) {
    throw new Error('Escrow output-note transaction id is missing.');
  }
  const response = await createStellarRpcServer(
    input.transactEnvironment.network.rpcUrl,
  ).getTransaction(txId);
  if (response.status !== Api.GetTransactionStatus.SUCCESS) {
    throw new Error('Escrow output-note transaction was not found.');
  }
  const meta = (response as Api.GetSuccessfulTransactionResponse).resultMetaXdr;
  if (!meta) {
    return [];
  }
  const events: EscrowOutputNoteCiphertextEvent[] = [];
  for (const event of collectContractEventsFromMeta(meta)) {
    const parsed = parseEscrowOutputNoteEvent(event, input.poolAddress);
    if (parsed) {
      events.push(parsed);
    }
  }
  return events;
}
