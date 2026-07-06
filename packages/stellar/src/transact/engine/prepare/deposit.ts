import type { StellarPreparedOperation } from '../../../types.js';
import { readPoolClientFactory } from '../../../contracts/contract-context.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import type { PrivacyPoolService } from '../../pool/service.js';
import { buildPrivateRecordFromDeposit } from '../../private-address/record-coin.js';
import {
  enrichPreparedOperation,
  resolveTokenContractId,
  resolveWalletPublicKey,
} from './shared.js';

const STROOPS_PER_UNIT = 10_000_000n;

async function createAlignedDepositWithProof(parameters: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  poolService: PrivacyPoolService;
  walletPublicKey: string;
  tokenAddress: string;
}) {
  const aligned = await parameters.poolService.createAlignedShieldCoinData({
    privateAddressStpl1: parameters.prepared.intent.to,
    amountStroops: parameters.prepared.intent.amount,
    tokenAddress: parameters.tokenAddress,
  });
  const poolClient = readPoolClientFactory(parameters.environment)({
    contractId: parameters.environment.network.poolContract,
    walletPublicKey: parameters.walletPublicKey,
    networkPassphrase: parameters.environment.network.networkPassphrase,
    sorobanRpcUrl: parameters.environment.network.rpcUrl,
  });
  const merkleTx = await poolClient.get_merkle_root();
  const proof = await parameters.poolService.prepareDepositTransactProof({
    privateAddressStpl1: parameters.prepared.intent.to,
    coin: aligned.coin,
    depositScalarHex: aligned.depositScalarHex,
    merkleRootBytes: merkleTx.result,
    tokenAddress: parameters.tokenAddress,
  });
  return { ...aligned, proof };
}

export async function prepareDepositOperation(
  prepared: StellarPreparedOperation,
  environment: StellarTransactEnvironment,
  poolService: PrivacyPoolService,
): Promise<StellarPreparedOperation> {
  const walletPublicKey = await resolveWalletPublicKey(environment, prepared);
  const tokenAddress = await resolveTokenContractId(environment, prepared.intent.asset);
  const depositProof = await createAlignedDepositWithProof({
    prepared,
    environment,
    poolService,
    walletPublicKey,
    tokenAddress,
  });
  const outputRecord = buildPrivateRecordFromDeposit({
    owner: walletPublicKey,
    privateAddress: prepared.intent.to,
    assetId: prepared.intent.asset,
    poolContract: environment.network.poolContract,
    amount: prepared.intent.amount,
    amountDisplay: Number(prepared.intent.amount) / Number(STROOPS_PER_UNIT),
    commitmentHex: depositProof.commitment_hex,
    coin: depositProof.coin,
    depositScalarHex: depositProof.depositScalarHex,
    precommitementHex: depositProof.precommitementHex,
    status: 'pending',
  });
  return enrichPreparedOperation(prepared, [outputRecord], {
    proofHex: depositProof.proof.proof_hex,
    publicHex: depositProof.proof.public_hex,
    applicationIdsPlaintext: depositProof.proof.applicationIdsPlaintext,
    tokenAddress,
    depositScalarHex: depositProof.depositScalarHex,
    precommitementHex: depositProof.precommitementHex,
    commitmentHex: depositProof.commitment_hex,
    walletPublicKey,
  });
}
