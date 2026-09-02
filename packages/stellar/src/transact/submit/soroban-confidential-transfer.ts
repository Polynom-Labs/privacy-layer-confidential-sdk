import { readPoolClientFactory } from '../../contracts/contract-context.js';
import { requestKytPassageForPoolInteraction } from '../kyt/passage-inspect.js';
import type { KytApplicationIdHints } from '../pool/proof-types.js';
import { submitPoolTransact } from './pool-transact.js';
import { resolveZkConfigNonce } from '../environment/zk-config-nonce.js';
import type { StellarTransactEnvironment } from '../environment/types.js';

export interface SubmitSorobanConfidentialTransferInput {
  contractId: string;
  walletPublicKey: string;
  proofHex: string;
  publicHex: string;
  applicationIdsPlaintext?: KytApplicationIdHints;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  transactEnvironment: StellarTransactEnvironment;
  escrowRecipient?: string;
}

export async function submitSorobanConfidentialTransfer(
  input: SubmitSorobanConfidentialTransferInput,
): Promise<string> {
  const poolClient = readPoolClientFactory(input.transactEnvironment)({
    contractId: input.contractId,
    walletPublicKey: input.walletPublicKey,
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
  });
  const approval = await requestKytPassageForPoolInteraction({
    owner: input.walletPublicKey,
    poolContract: input.contractId,
    proofHex: input.proofHex,
    publicHex: input.publicHex,
    ...(input.applicationIdsPlaintext
      ? { applicationIdsPlaintext: input.applicationIdsPlaintext }
      : {}),
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
    transactEnvironment: input.transactEnvironment,
  });
  return submitPoolTransact({
    contractClient: poolClient,
    contractId: input.contractId,
    from: input.walletPublicKey,
    nonce: resolveZkConfigNonce(input.transactEnvironment),
    proofHex: input.proofHex,
    publicHex: input.publicHex,
    approval,
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
    transactEnvironment: input.transactEnvironment,
    ...(input.escrowRecipient ? { escrowRecipient: input.escrowRecipient } : {}),
  });
}
