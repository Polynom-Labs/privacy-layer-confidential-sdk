import type { InspectKytPassageApproved } from '@arcanetech/stellar-privacy-pool-zk-sdk';
import {
  Account,
  Address,
  Contract,
  nativeToScVal,
  TransactionBuilder,
  rpc,
  type xdr,
} from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import { createStellarRpcServer } from '../../rpc/server.js';
import type { StellarPreparedOperation } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import { resolveZkConfigNonce } from '../environment/zk-config-nonce.js';
import { requestKytPassageForPoolInteraction } from '../kyt/passage-inspect.js';
import { approvalSignatureToBytes } from '../kyt/passage/submit.js';
import { kytAuthorizationScValue } from './kyt-authorization-sc-value.js';
import { pickUnsignedEscrowAuthorization } from './pick-escrow-authorization.js';

const SIMULATE_FEE = '100';
const SIMULATE_TIMEOUT_SECONDS = 30;
const RECORD_NONROOT_AUTH = 'record_allow_nonroot' as const;

type SweepArtifacts = {
  proofHex: string;
  publicHex: string;
  ciphertextHex?: string;
  outputNoteEphemeralScalars?: string[];
  escrowRecipient: string;
};

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/iu, ''), 'hex');
}

function optionalSweepCiphertext(
  artifacts: StellarPreparedOperation['transactArtifacts'],
): Pick<SweepArtifacts, 'ciphertextHex' | 'outputNoteEphemeralScalars'> {
  return {
    ...(artifacts?.ciphertextHex ? { ciphertextHex: artifacts.ciphertextHex } : {}),
    ...(artifacts?.outputNoteEphemeralScalars
      ? { outputNoteEphemeralScalars: artifacts.outputNoteEphemeralScalars }
      : {}),
  };
}

function requireSweepArtifacts(prepared: StellarPreparedOperation): SweepArtifacts {
  const artifacts = prepared.transactArtifacts;
  const proofHex = artifacts?.proofHex?.trim();
  const publicHex = artifacts?.publicHex?.trim();
  const escrowRecipient = artifacts?.escrowRecipient?.trim();
  if (!proofHex || !publicHex || !escrowRecipient) {
    throw new Error('Prepared sweep is missing proof, public signals, or claimant.');
  }
  return {
    proofHex,
    publicHex,
    escrowRecipient,
    ...optionalSweepCiphertext(artifacts),
  };
}

function requireRelayerPublicKey(value: string): string {
  const relayerPublicKey = value.trim();
  if (!relayerPublicKey) {
    throw new Error('Escrow sweep simulation requires the relayer public key.');
  }
  return relayerPublicKey;
}

async function inspectRelayerSweepKyt(input: {
  artifacts: SweepArtifacts;
  prepared: StellarPreparedOperation;
  transactEnvironment: StellarTransactEnvironment;
  relayerPublicKey: string;
}) {
  const environment = input.transactEnvironment;
  return requestKytPassageForPoolInteraction({
    owner: input.relayerPublicKey,
    poolContract: environment.network.poolContract,
    proofHex: input.artifacts.proofHex,
    publicHex: input.artifacts.publicHex,
    ...(input.artifacts.ciphertextHex
      ? { ciphertextHex: input.artifacts.ciphertextHex }
      : {}),
    ...(input.artifacts.outputNoteEphemeralScalars
      ? { outputNoteEphemeralScalars: input.artifacts.outputNoteEphemeralScalars }
      : {}),
    ...(input.prepared.transactArtifacts?.applicationIdsPlaintext
      ? {
          applicationIdsPlaintext:
            input.prepared.transactArtifacts.applicationIdsPlaintext,
        }
      : {}),
    networkPassphrase: environment.network.networkPassphrase,
    sorobanRpcUrl: environment.network.rpcUrl,
    transactEnvironment: environment,
  });
}

async function simulateSweepAuthEntries(input: {
  artifacts: SweepArtifacts;
  transactEnvironment: StellarTransactEnvironment;
  relayerPublicKey: string;
  approval: InspectKytPassageApproved;
}): Promise<readonly xdr.SorobanAuthorizationEntry[]> {
  const environment = input.transactEnvironment;
  const server = createStellarRpcServer(environment.network.rpcUrl);
  const account = await server.getAccount(input.relayerPublicKey);
  const operation = new Contract(environment.network.poolContract).call(
    'transact',
    new Address(input.relayerPublicKey).toScVal(),
    nativeToScVal(resolveZkConfigNonce(environment), { type: 'u64' }),
    nativeToScVal(hexToBytes(input.artifacts.proofHex), { type: 'bytes' }),
    nativeToScVal(hexToBytes(input.artifacts.publicHex), { type: 'bytes' }),
    nativeToScVal(hexToBytes(input.artifacts.ciphertextHex ?? ''), { type: 'bytes' }),
    kytAuthorizationScValue({
      expirationLedger: input.approval.expiresAtLedger,
      signature: approvalSignatureToBytes(input.approval.signature),
    }),
  );
  const built = new TransactionBuilder(
    new Account(account.accountId(), account.sequenceNumber()),
    {
      fee: SIMULATE_FEE,
      networkPassphrase: environment.network.networkPassphrase,
    },
  )
    .addOperation(operation)
    .setTimeout(SIMULATE_TIMEOUT_SECONDS)
    .build();
  const simulated = await server.simulateTransaction(
    built,
    { cpuInstructions: 0 },
    RECORD_NONROOT_AUTH,
  );
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Escrow sweep authorization simulation failed: ${simulated.error}`);
  }
  return simulated.result?.auth ?? [];
}

export async function unsignedEscrowAuthorizationForSweep(input: {
  prepared: StellarPreparedOperation;
  transactEnvironment: StellarTransactEnvironment;
  relayerPublicKey: string;
}): Promise<string> {
  const relayerPublicKey = requireRelayerPublicKey(input.relayerPublicKey);
  const artifacts = requireSweepArtifacts(input.prepared);
  const approval = await inspectRelayerSweepKyt({
    artifacts,
    prepared: input.prepared,
    transactEnvironment: input.transactEnvironment,
    relayerPublicKey,
  });
  const auth = await simulateSweepAuthEntries({
    artifacts,
    transactEnvironment: input.transactEnvironment,
    relayerPublicKey,
    approval,
  });
  return pickUnsignedEscrowAuthorization({
    auth,
    claimantAddress: artifacts.escrowRecipient,
  });
}
