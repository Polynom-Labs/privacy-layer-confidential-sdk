import type { StellarNetworkConfig } from '../types.js';
import type { PoolClientFactory } from '../transact/pool/types.js';
import { createStellarRpcServer, type StellarRpcServer } from '../rpc/server.js';
import { createInternalPoolContractClient } from './pool/create-pool-client.js';
import {
  createInternalRegistryContractClient,
  type RegistryContractWriteClient,
} from './registry/create-registry-client.js';
import type { StellarSignTransaction } from './signing.js';

export type RegistryClientFactory = (input: {
  contractId: string;
  walletPublicKey: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
}) => RegistryContractWriteClient;

export type StellarContractContext = {
  network: StellarNetworkConfig;
  signTransaction: StellarSignTransaction;
  rpcServer: StellarRpcServer;
  createPoolClient: PoolClientFactory;
  createRegistryClient: RegistryClientFactory;
};

function composeStellarContractContext(input: {
  network: StellarNetworkConfig;
  signTransaction: StellarSignTransaction;
}): StellarContractContext {
  const rpcServer = createStellarRpcServer(input.network.rpcUrl);
  return {
    network: input.network,
    signTransaction: input.signTransaction,
    rpcServer,
    createPoolClient: (parameters) =>
      createInternalPoolContractClient({
        ...parameters,
        signTransaction: input.signTransaction,
      }),
    createRegistryClient: (parameters) =>
      createInternalRegistryContractClient({
        ...parameters,
        signTransaction: input.signTransaction,
      }),
  };
}

export type ResolvedStellarTransactEnvironment =
  import('../transact/environment/types.js').StellarTransactEnvironment & {
    contractContext: StellarContractContext;
  };

export function attachContractContext(
  environment: import('../transact/environment/types.js').StellarTransactEnvironment,
): ResolvedStellarTransactEnvironment {
  if (!environment.signTransaction) {
    throw new Error(
      'Stellar transact environment requires signTransaction for on-chain contract access.',
    );
  }
  return {
    ...environment,
    contractContext: composeStellarContractContext({
      network: environment.network,
      signTransaction: environment.signTransaction,
    }),
  };
}

export function requireContractContext(
  environment:
    import('../transact/environment/types.js').StellarTransactEnvironment | undefined,
): StellarContractContext {
  if (!environment || !('contractContext' in environment)) {
    throw new Error('Contract context is not configured on the transact environment.');
  }
  const resolved = environment as ResolvedStellarTransactEnvironment;
  return resolved.contractContext;
}

export function readPoolClientFactory(
  environment: import('../transact/environment/types.js').StellarTransactEnvironment,
): PoolClientFactory {
  return requireContractContext(environment).createPoolClient;
}
