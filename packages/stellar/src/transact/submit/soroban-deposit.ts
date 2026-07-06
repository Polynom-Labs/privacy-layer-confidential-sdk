import type { CoinData } from '@auditable/privacy-pool-zk-sdk';
import { readPoolClientFactory } from '../../contracts/contract-context.js';
import type { PrivacyPoolService } from '../pool/service.js';
import { requestKytPassageForPoolInteraction } from '../kyt/passage-inspect.js';
import { submitPoolTransact } from './pool-transact.js';
import type { StellarTransactEnvironment } from '../environment/types.js';

export interface SubmitSorobanDepositInput {
  contractId: string;
  walletPublicKey: string;
  privateAddressStpl1: string;
  coin: CoinData;
  depositScalarHex: string;
  tokenAddress: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  privacyPoolService: PrivacyPoolService;
  transactEnvironment: StellarTransactEnvironment;
}

export async function submitSorobanDeposit(
  input: SubmitSorobanDepositInput,
): Promise<string> {
  const poolClient = readPoolClientFactory(input.transactEnvironment)({
    contractId: input.contractId,
    walletPublicKey: input.walletPublicKey,
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
  });
  const merkleTx = await poolClient.get_merkle_root();
  const merkleRootBuffer = merkleTx.result;

  const { applicationIdsPlaintext, proof_hex, public_hex } =
    await input.privacyPoolService.prepareDepositTransactProof({
      privateAddressStpl1: input.privateAddressStpl1,
      coin: input.coin,
      depositScalarHex: input.depositScalarHex,
      merkleRootBytes: merkleRootBuffer,
      tokenAddress: input.tokenAddress,
    });

  const approval = await requestKytPassageForPoolInteraction({
    owner: input.walletPublicKey,
    poolContract: input.contractId,
    proofHex: proof_hex,
    publicHex: public_hex,
    applicationIdsPlaintext,
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
    transactEnvironment: input.transactEnvironment,
  });
  return submitPoolTransact({
    contractClient: poolClient,
    from: input.walletPublicKey,
    proofHex: proof_hex,
    publicHex: public_hex,
    approval,
  });
}
