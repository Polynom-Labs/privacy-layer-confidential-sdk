import { completeSucceededOperation } from './complete-succeeded-operation.js';
import { canOfferDirectSubmission } from './fallback-policy.js';
import { requireStoredOperation } from './complete-succeeded-operation.js';
import type { ProtocolRelayPorts, SubmitPrivateOperationResult } from './types.js';

export async function submitDirectFallback(input: {
  ports: ProtocolRelayPorts;
  walletPublicKey: string;
  operationId: string;
  consent: boolean;
}): Promise<SubmitPrivateOperationResult> {
  const operation = await requireStoredOperation(input);
  if (!input.consent || !canOfferDirectSubmission(operation)) {
    throw new Error('Direct submission fallback is not allowed.');
  }
  const receipt = await input.ports.submitDirect(operation);
  return completeSucceededOperation({
    ports: input.ports,
    operation,
    txId: receipt.txId,
  });
}
