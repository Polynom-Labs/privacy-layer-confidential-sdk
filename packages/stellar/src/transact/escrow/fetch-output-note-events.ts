import { Api } from '@stellar/stellar-sdk/rpc';
import { createStellarRpcServer } from '../../rpc/server.js';
import { parseEscrowOutputNoteEventsFromMeta } from './parse-output-note-events.js';
import type { EscrowOutputNoteCiphertextEvent } from './reconstruct-escrow-note.js';

export async function fetchEscrowOutputNoteEvents(input: {
  rpcUrl: string;
  txId: string;
  poolAddress: string;
}): Promise<EscrowOutputNoteCiphertextEvent[]> {
  const txId = input.txId.trim();
  if (!txId) {
    throw new Error('Escrow output-note transaction id is missing.');
  }
  const response = await createStellarRpcServer(input.rpcUrl).getTransaction(txId);
  if (response.status !== Api.GetTransactionStatus.SUCCESS) {
    throw new Error('Escrow output-note transaction was not found.');
  }
  return parseEscrowOutputNoteEventsFromMeta(
    (response as Api.GetSuccessfulTransactionResponse).resultMetaXdr,
    input.poolAddress,
  );
}
