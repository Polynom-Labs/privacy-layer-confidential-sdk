import { expectTypeOf, test } from 'vitest';
import type {
  DepositIntent,
  OperationResult,
  PreparedOperation,
  RejectedOperation,
  TransferIntent,
} from '../src/index.js';

type Address = string;
type Asset = string;
type PendingClaimFrom = { kind: 'pendingClaim'; claimId: string };
type Prepared = { id: string };
type Receipt = { ok: boolean };

const intent: DepositIntent<Address, Asset, bigint> = {
  from: 'sender',
  to: 'recipient',
  asset: 'USDC',
  amount: 100n,
  disclosure: {
    senderAddress: 'public',
    recipientAddress: 'private',
    assetAddress: 'public',
    amount: 'public',
  },
};

test('transfer intent supports different from and to address types', () => {
  const transfer: TransferIntent<PendingClaimFrom, Asset, bigint, Address> = {
    from: { kind: 'pendingClaim', claimId: 'claim-1' },
    to: 'stpl1-recipient',
    asset: 'USDC',
    amount: 25n,
    disclosure: {
      senderAddress: 'public',
      recipientAddress: 'private',
      assetAddress: 'public',
      amount: 'public',
    },
  };

  expectTypeOf(transfer.from).toEqualTypeOf<PendingClaimFrom>();
  expectTypeOf(transfer.to).toEqualTypeOf<Address>();
});

test('prepared operations expose execute', () => {
  const prepared: PreparedOperation<
    'deposit',
    Address,
    Asset,
    bigint,
    Prepared,
    Receipt
  > = {
    status: 'prepared',
    kind: 'deposit',
    intent,
    prepared: { id: 'plan' },
    execute: async () => ({ ok: true }),
  };

  expectTypeOf(prepared.execute).toBeFunction();
});

test('rejected operations and raw intents do not expose execute', () => {
  const rejected: RejectedOperation = {
    status: 'rejected',
    errors: [],
  };

  expectTypeOf(rejected).not.toHaveProperty('execute');
  expectTypeOf(intent).not.toHaveProperty('execute');
});

test('operation result union narrows to prepared execute', () => {
  const result: OperationResult<'deposit', Address, Asset, bigint, Prepared, Receipt> =
    {
      status: 'prepared',
      kind: 'deposit',
      intent,
      prepared: { id: 'plan' },
      execute: async () => ({ ok: true }),
    };

  if (result.status === 'prepared') {
    expectTypeOf(result.execute).toBeFunction();
  }
});
