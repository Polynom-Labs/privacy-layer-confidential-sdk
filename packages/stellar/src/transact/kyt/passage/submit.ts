import type { InspectKytPassageApproved } from '@auditable/privacy-pool-zk-sdk';
import { Buffer } from 'buffer';
import { Operation, TransactionBuilder, rpc, xdr } from '@stellar/stellar-sdk';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import { waitForKytRegistration } from './poll.js';

const KYT_REGISTER_FEE_STROOPS = '1000000';
const KYT_REGISTER_TIMEOUT_SECONDS = 300;

function passageIdToScValue(passageId: string): xdr.ScVal {
  return xdr.ScVal.scvBytes(Buffer.from(passageId.replace(/^0x/, ''), 'hex'));
}

export function approvalSignatureToBytes(signature: string): Buffer {
  const clean = signature.trim();
  return /^(0x)?[0-9a-fA-F]{128}$/.test(clean)
    ? Buffer.from(clean.replace(/^0x/i, ''), 'hex')
    : Buffer.from(clean, 'base64');
}

function signatureToScValue(signature: string): xdr.ScVal {
  const bytes = approvalSignatureToBytes(signature);
  return xdr.ScVal.scvBytes(bytes);
}

export async function registerKytPassage(parameters: {
  approval: InspectKytPassageApproved;
  owner: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  transactEnvironment: StellarTransactEnvironment;
}): Promise<void> {
  const signTransaction = parameters.transactEnvironment.signTransaction;
  if (!signTransaction) {
    throw new Error(
      'KYT passage registration requires a wallet signTransaction adapter.',
    );
  }
  const kytRegistry = parameters.transactEnvironment.kyt.kytPassageRegistryContract;
  const server = new rpc.Server(parameters.sorobanRpcUrl, { allowHttp: true });
  const sourceAccount = await server.getAccount(parameters.owner);
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: KYT_REGISTER_FEE_STROOPS,
    networkPassphrase: parameters.networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: kytRegistry,
        function: 'register_passage',
        args: [
          passageIdToScValue(parameters.approval.passageId),
          xdr.ScVal.scvU32(parameters.approval.expiresAtLedger),
          signatureToScValue(parameters.approval.signature),
        ],
      }),
    )
    .setTimeout(KYT_REGISTER_TIMEOUT_SECONDS)
    .build();
  const preparedTransaction = await server.prepareTransaction(transaction);
  const { signedTxXdr } = await signTransaction({
    xdr: preparedTransaction.toXDR(),
    networkPassphrase: parameters.networkPassphrase,
    address: parameters.owner,
  });
  const signedTransaction = TransactionBuilder.fromXDR(
    signedTxXdr,
    parameters.networkPassphrase,
  );
  const result = await server.sendTransaction(signedTransaction);
  const status = String(result.status);
  if (status !== 'PENDING' && status !== 'SUCCESS') {
    throw new Error(`KYT passage registration submit failed: ${status}`);
  }
  await waitForKytRegistration({ server, hash: result.hash });
}
