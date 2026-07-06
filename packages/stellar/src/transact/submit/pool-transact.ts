import type { OnboardingPayload } from '../onboarding/payload.js';
import { approvalSignatureToBytes } from '../kyt/passage-inspect.js';
import { runTtlPreflight } from '../submit/ttl-preflight.js';
import type { PoolTransactClient } from '../pool/types.js';
import type { InspectKytPassageApproved } from '@auditable/privacy-pool-zk-sdk';
import { Buffer } from 'buffer';

export async function submitPoolTransact(parameters: {
  contractClient: PoolTransactClient;
  from: string;
  proofHex: string;
  publicHex: string;
  onboarding?: OnboardingPayload;
  approval: InspectKytPassageApproved;
}): Promise<string> {
  const assembledTransaction = await parameters.contractClient.transact({
    from: parameters.from,
    proof_bytes: Buffer.from(parameters.proofHex.replace(/^0x/iu, ''), 'hex'),
    pub_signals_bytes: Buffer.from(parameters.publicHex.replace(/^0x/iu, ''), 'hex'),
    onboarding: parameters.onboarding,
    kyt_authorization: {
      expiration_ledger: parameters.approval.expiresAtLedger,
      signature: approvalSignatureToBytes(parameters.approval.signature),
    },
  });
  await runTtlPreflight(assembledTransaction);
  const sentTransaction = await assembledTransaction.signAndSend();
  const transactionHash = sentTransaction.sendTransactionResponse?.hash ?? '';
  if (!transactionHash) {
    throw new Error('Transaction failed');
  }
  return transactionHash;
}
