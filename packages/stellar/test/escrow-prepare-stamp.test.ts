import { describe, expect, it } from 'vitest';
import { prepareTransferOperation } from '../src/transact/engine/prepare/spend.js';
import type { StellarPreparedOperation } from '../src/types.js';
import type { StellarTransactEnvironment } from '../src/transact/environment/types.js';
import {
  isEscrowPreparedOperation,
  requiredSubmissionMethod,
  SUBMISSION_METHOD,
} from '../src/transact/index.js';

const ESCROW_G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const PRIVATE_DISCLOSURE = {
  senderAddress: 'private' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'private' as const,
  amount: 'private' as const,
};

function preparedTransfer(to: string): StellarPreparedOperation {
  return {
    kind: 'transfer',
    intent: {
      from: 'stpl1sender',
      to,
      asset: 'USDC',
      amount: 1n,
      disclosure: PRIVATE_DISCLOSURE,
    },
    consumedRecords: [],
    outputRecords: [],
    submissionPayload: { operationId: 'op-1', signed: false },
    transactArtifacts: { spendSource: 'privateAddress' },
  };
}

function environment(
  resolveTransferRecipientAtExecute?: StellarTransactEnvironment['resolveTransferRecipientAtExecute'],
): StellarTransactEnvironment {
  return {
    network: {
      id: 'test',
      rpcUrl: 'https://example.invalid',
      networkPassphrase: 'Test',
      poolContract: 'C-POOL',
      registryContract: 'C-REGISTRY',
      applicationId: 'app-1',
    },
    kyt: {
      apiBaseUrl: 'https://example.invalid',
      kytPassageRegistryContract: 'C-KYT',
    },
    resolveWalletPublicKey: async () => 'G-WALLET',
    resolveTokenContractId: async () => 'C-TOKEN',
    ...(resolveTransferRecipientAtExecute ? { resolveTransferRecipientAtExecute } : {}),
  };
}

describe('prepareTransferOperation escrow stamp', () => {
  it('stamps escrow artifacts before submit so relay policy can refuse on the live route', async () => {
    const stamped = await prepareTransferOperation(
      preparedTransfer(ESCROW_G),
      environment(async () => ({
        recipientPrivateAddressStpl1: 'stpl1escrow',
        recipientStellarAddress: ESCROW_G,
        escrowSend: {
          nonceDecimal: '0',
          recipientHi: '1',
          recipientLo: '2',
          recipientStellarAddress: ESCROW_G,
        },
      })),
    );

    expect(isEscrowPreparedOperation(stamped)).toBe(true);
    expect(stamped.transactArtifacts?.spendSource).toBe('escrow');
    expect(requiredSubmissionMethod(stamped)).toBe(SUBMISSION_METHOD.relay);
  });

  it('leaves a registered G-address transfer as a private-address spend', async () => {
    const stamped = await prepareTransferOperation(
      preparedTransfer(ESCROW_G),
      environment(async () => ({
        recipientPrivateAddressStpl1: 'stpl1registered',
        recipientStellarAddress: ESCROW_G,
      })),
    );

    expect(isEscrowPreparedOperation(stamped)).toBe(false);
    expect(stamped.transactArtifacts?.spendSource).toBe('privateAddress');
  });
});
