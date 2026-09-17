import type { StellarPreparedOperation } from '../../../types.js';
import { readPoolClientFactory } from '../../../contracts/contract-context.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import type { PrivacyPoolService } from '../../pool/service.js';
import { ciphertextArtifactsFromProof } from '../../pool/proof-types.js';
import { buildPrivateRecordFromDeposit } from '../../private-address/record-coin.js';
import {
  enrichPreparedOperation,
  resolveTokenContractId,
  resolveWalletPublicKey,
} from './shared.js';
import { quoteFeeOutputForPrepared } from '../../fees/quote-fee-output-for-prepared.js';
import { zkConfigNonceForFeeBearingKind } from '../../fees/zk-config-nonce-for-kind.js';

const STROOPS_PER_UNIT = 10_000_000n;

async function createAlignedDepositWithProof(parameters: {
  prepared: StellarPreparedOperation;
  environment: StellarTransactEnvironment;
  poolService: PrivacyPoolService;
  walletPublicKey: string;
  tokenAddress: string;
}) {
  const feeOutput = await quoteFeeOutputForPrepared(parameters);
  const instructed = parameters.prepared.intent.amount;
  const userAmount = instructed - (feeOutput?.requiredFee ?? 0n);
  if (userAmount <= 0n) {
    throw new Error('Required Fee leaves no spendable deposit note');
  }
  const aligned = await parameters.poolService.createAlignedShieldCoinData({
    privateAddressStpl1: parameters.prepared.intent.to,
    amountStroops: userAmount,
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
    publicDepositStroops: instructed,
    ...(feeOutput ? { feeOutput } : {}),
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
    amount: BigInt(depositProof.coin.value),
    amountDisplay: Number(depositProof.coin.value) / Number(STROOPS_PER_UNIT),
    commitmentHex: depositProof.commitment_hex,
    coin: depositProof.coin,
    depositScalarHex: depositProof.depositScalarHex,
    precommitementHex: depositProof.precommitementHex,
    status: 'pending',
  });
  return enrichPreparedOperation(prepared, [outputRecord], {
    proofHex: depositProof.proof.proof_hex,
    publicHex: depositProof.proof.public_hex,
    ...ciphertextArtifactsFromProof(depositProof.proof),
    applicationIdsPlaintext: depositProof.proof.applicationIdsPlaintext,
    tokenAddress,
    depositScalarHex: depositProof.depositScalarHex,
    precommitementHex: depositProof.precommitementHex,
    commitmentHex: depositProof.commitment_hex,
    walletPublicKey,
    zkConfigNonce: zkConfigNonceForFeeBearingKind({ kind: 'deposit' }),
  });
}
