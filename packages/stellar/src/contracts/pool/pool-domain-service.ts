import { Buffer } from 'buffer';
import type { StellarContractContext } from '../contract-context.js';

function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(clean, 'hex');
}

export async function readNullifierConsumedOnChain(input: {
  contractContext: StellarContractContext;
  poolContractId: string;
  walletPublicKey: string;
  nullifierHashHex: string;
}): Promise<boolean> {
  const client = input.contractContext.createPoolClient({
    contractId: input.poolContractId,
    walletPublicKey: input.walletPublicKey,
    networkPassphrase: input.contractContext.network.networkPassphrase,
    sorobanRpcUrl: input.contractContext.network.rpcUrl,
  });
  const read = await client.is_nulifier_hash_consumed({
    hash: hexToBuffer(input.nullifierHashHex),
  });
  return read.result as boolean;
}
