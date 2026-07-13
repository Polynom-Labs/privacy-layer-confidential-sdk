import {
  Address,
  Operation,
  SorobanDataBuilder,
  TransactionBuilder,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import type { StellarSignTransaction } from '../../contracts/signing.js';

const ZK_CONFIG_TTL_THRESHOLD_LEDGERS = 100_000;
const ZK_CONFIG_TTL_EXTEND_TO_LEDGERS = 500_000;
const EXTEND_TTL_FEE_STROOPS = '1000000';
const EXTEND_TTL_TIMEOUT_SECONDS = 300;
const EXTEND_TTL_MAX_POLLS = 60;
const EXTEND_TTL_POLL_INTERVAL_MS = 1000;

async function waitForExtendFootprintTtlConfirmation(parameters: {
  server: rpc.Server;
  hash: string;
}): Promise<void> {
  for (let attempt = 0; attempt < EXTEND_TTL_MAX_POLLS; attempt += 1) {
    const response = await parameters.server.getTransaction(parameters.hash);
    if (response.status === 'SUCCESS') {
      return;
    }
    if (response.status === 'FAILED') {
      throw new Error('ZK config TTL extension failed on-chain');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, EXTEND_TTL_POLL_INTERVAL_MS);
    });
  }
  throw new Error('ZK config TTL extension was not confirmed in time');
}

function zkConfigLedgerKey(contractId: string, nonce: bigint): xdr.LedgerKey {
  const configKeyScValue = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Config'),
    xdr.ScVal.scvU64(xdr.Uint64.fromString(nonce.toString())),
  ]);
  return xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: new Address(contractId).toScAddress(),
      key: configKeyScValue,
      durability: xdr.ContractDataDurability.persistent(),
    }),
  );
}

async function needsTtlExtension(parameters: {
  server: rpc.Server;
  ledgerKey: xdr.LedgerKey;
}): Promise<boolean> {
  const [entriesResponse, latestLedger] = await Promise.all([
    parameters.server.getLedgerEntries(parameters.ledgerKey),
    parameters.server.getLatestLedger(),
  ]);
  const entry = entriesResponse.entries.at(0);
  if (!entry || entry.liveUntilLedgerSeq === undefined) {
    return false;
  }
  const remainingLedgers = entry.liveUntilLedgerSeq - latestLedger.sequence;
  return remainingLedgers < ZK_CONFIG_TTL_THRESHOLD_LEDGERS;
}

async function submitExtendFootprintTtlTransaction(parameters: {
  server: rpc.Server;
  ledgerKey: xdr.LedgerKey;
  networkPassphrase: string;
  sourcePublicKey: string;
  signTransaction: StellarSignTransaction;
}): Promise<void> {
  const sourceAccount = await parameters.server.getAccount(parameters.sourcePublicKey);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: EXTEND_TTL_FEE_STROOPS,
    networkPassphrase: parameters.networkPassphrase,
  })
    .addOperation(
      Operation.extendFootprintTtl({ extendTo: ZK_CONFIG_TTL_EXTEND_TO_LEDGERS }),
    )
    .setSorobanData(
      new SorobanDataBuilder().setReadOnly([parameters.ledgerKey]).build(),
    )
    .setTimeout(EXTEND_TTL_TIMEOUT_SECONDS)
    .build();
  const preparedTransaction = await parameters.server.prepareTransaction(transaction);
  const { signedTxXdr } = await parameters.signTransaction({
    xdr: preparedTransaction.toXDR(),
    networkPassphrase: parameters.networkPassphrase,
    address: parameters.sourcePublicKey,
  });
  const signedTransaction = TransactionBuilder.fromXDR(
    signedTxXdr,
    parameters.networkPassphrase,
  );
  const result = await parameters.server.sendTransaction(signedTransaction);
  const status = String(result.status);
  if (status !== 'PENDING' && status !== 'SUCCESS') {
    throw new Error(`ZK config TTL extension submit failed: ${status}`);
  }
  await waitForExtendFootprintTtlConfirmation({
    server: parameters.server,
    hash: result.hash,
  });
}

/**
 * Checks the remaining TTL of the pool's per-nonce `ZkConfig` persistent
 * ledger entry and, if it is below the extend threshold, submits a
 * standalone `extendFootprintTtl` transaction to bump it before the main
 * `transact` call is sent. No-ops when the entry does not exist yet (it
 * will be created and TTL-bumped by `add_zk_config` instead) or when no
 * `signTransaction` adapter is configured.
 */
export async function extendZkConfigTtlIfNeeded(parameters: {
  sorobanRpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  nonce: bigint;
  sourcePublicKey: string;
  signTransaction: StellarSignTransaction | undefined;
}): Promise<void> {
  if (!parameters.signTransaction) {
    return;
  }
  const server = new rpc.Server(parameters.sorobanRpcUrl, { allowHttp: true });
  const ledgerKey = zkConfigLedgerKey(parameters.contractId, parameters.nonce);
  if (!(await needsTtlExtension({ server, ledgerKey }))) {
    return;
  }
  await submitExtendFootprintTtlTransaction({
    server,
    ledgerKey,
    networkPassphrase: parameters.networkPassphrase,
    sourcePublicKey: parameters.sourcePublicKey,
    signTransaction: parameters.signTransaction,
  });
}
