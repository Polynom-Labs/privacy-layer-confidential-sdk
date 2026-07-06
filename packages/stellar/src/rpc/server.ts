import { rpc } from '@stellar/stellar-sdk';

export type StellarRpcServer = rpc.Server;

export function createStellarRpcServer(rpcUrl: string): StellarRpcServer {
  return new rpc.Server(rpcUrl.trim(), { allowHttp: true });
}
