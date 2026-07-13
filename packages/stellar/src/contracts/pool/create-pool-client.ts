import { Client as PrivacyPoolContractClient } from 'contract';
import type { PoolTransactClient } from '../../transact/pool/types.js';
import {
  adaptSignTransactionForGeneratedBinding,
  type StellarSignTransaction,
} from '../signing.js';

export function createInternalPoolContractClient(input: {
  contractId: string;
  walletPublicKey: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  signTransaction: StellarSignTransaction;
}): PoolTransactClient {
  const signBinding = adaptSignTransactionForGeneratedBinding(input.signTransaction, {
    networkPassphrase: input.networkPassphrase,
    walletPublicKey: input.walletPublicKey,
  });
  const client = new PrivacyPoolContractClient({
    contractId: input.contractId,
    networkPassphrase: input.networkPassphrase,
    rpcUrl: input.sorobanRpcUrl,
    allowHttp: true,
    publicKey: input.walletPublicKey,
    signTransaction: signBinding,
  });
  return client as unknown as PoolTransactClient;
}
