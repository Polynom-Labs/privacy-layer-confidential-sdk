import type { CoinData } from '@auditable/privacy-pool-zk-sdk';
import { readPoolClientFactory } from '../../contracts/contract-context.js';
import type { PrivacyPoolService } from '../pool/service.js';
import { requestKytPassageForPoolInteraction } from '../kyt/passage-inspect.js';
import { ciphertextArtifactsFromProof } from '../pool/proof-types.js';
import { submitPoolTransact } from './pool-transact.js';
import { resolveZkConfigNonce } from '../environment/zk-config-nonce.js';
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

  const proof = await input.privacyPoolService.prepareDepositTransactProof({
    privateAddressStpl1: input.privateAddressStpl1,
    coin: input.coin,
    depositScalarHex: input.depositScalarHex,
    merkleRootBytes: merkleRootBuffer,
    tokenAddress: input.tokenAddress,
  });
  const ciphertext = ciphertextArtifactsFromProof(proof);

  const approval = await requestKytPassageForPoolInteraction({
    owner: input.walletPublicKey,
    poolContract: input.contractId,
    proofHex: proof.proof_hex,
    publicHex: proof.public_hex,
    applicationIdsPlaintext: proof.applicationIdsPlaintext,
    ...ciphertext,
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
    transactEnvironment: input.transactEnvironment,
  });
  return submitPoolTransact({
    contractClient: poolClient,
    contractId: input.contractId,
    from: input.walletPublicKey,
    nonce: resolveZkConfigNonce(input.transactEnvironment),
    proofHex: proof.proof_hex,
    publicHex: proof.public_hex,
    ...ciphertext,
    approval,
    networkPassphrase: input.networkPassphrase,
    sorobanRpcUrl: input.sorobanRpcUrl,
    transactEnvironment: input.transactEnvironment,
  });
}
