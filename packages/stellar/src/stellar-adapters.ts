import type {
  DepositIntent,
  NetworkAdapter,
  PolicyAdapter,
  PrivacySdkError,
  TransferIntent,
  WithdrawIntent,
} from '@arcane/privacy-sdk-core';
import { executionError, insufficientStateError } from '@arcane/privacy-sdk-core';
import { validateStellarDisclosure } from './disclosure-policy.js';
import { submitPreparedOperation } from './operation-execution.js';
import type {
  StellarAddress,
  StellarAssetId,
  StellarOperationReceipt,
  StellarPolicyAdapter,
  StellarPreparedOperation,
  StellarPrivateRecord,
  StellarStorageAdapter,
  StellarTransactEngine,
  StellarWalletAdapter,
} from './types.js';

type StellarIntent =
  | DepositIntent<StellarAddress, StellarAssetId, bigint>
  | TransferIntent<StellarAddress, StellarAssetId, bigint>
  | WithdrawIntent<StellarAddress, StellarAssetId, bigint>;

export function createStellarPolicyAdapter(
  policy?: StellarPolicyAdapter,
): PolicyAdapter<StellarAddress, StellarAssetId, bigint> {
  return {
    validateDeposit: async (intent) => [
      ...validateStellarDisclosure('deposit', intent),
      ...(await runExternalPolicy('deposit', intent, policy)),
    ],
    validateTransfer: async (intent) => [
      ...validateStellarDisclosure('transfer', intent),
      ...(await runExternalPolicy('transfer', intent, policy)),
    ],
    validateWithdraw: async (intent) => [
      ...validateStellarDisclosure('withdraw', intent),
      ...(await runExternalPolicy('withdraw', intent, policy)),
    ],
  };
}

async function runExternalPolicy(
  kind: 'deposit' | 'transfer' | 'withdraw',
  intent: StellarIntent,
  policy: StellarPolicyAdapter | undefined,
): Promise<PrivacySdkError[]> {
  if (policy === undefined) {
    return [];
  }

  try {
    await policy.inspectOperation(kind, intent);
    return [];
  } catch (error) {
    return [
      executionError(
        error instanceof Error ? error.message : 'Policy inspection failed.',
        'policyCheck',
      ),
    ];
  }
}

export function createStellarNetworkAdapter(deps: {
  storage: StellarStorageAdapter;
  wallet: StellarWalletAdapter;
  engine: StellarTransactEngine;
}): NetworkAdapter<
  StellarAddress,
  StellarAssetId,
  bigint,
  StellarPreparedOperation,
  StellarOperationReceipt
> {
  return {
    prepareDeposit: async (intent) =>
      prepareOperation({ kind: 'deposit', intent, ...deps }),
    prepareTransfer: async (intent) =>
      prepareOperation({ kind: 'transfer', intent, ...deps }),
    prepareWithdraw: async (intent) =>
      prepareOperation({ kind: 'withdraw', intent, ...deps }),
    submit: async (prepared, options) => {
      const submissionInput = {
        prepared,
        storage: deps.storage,
        wallet: deps.wallet,
        engine: deps.engine,
      };
      if (options !== undefined) {
        return submitPreparedOperation({ ...submissionInput, options });
      }
      return submitPreparedOperation(submissionInput);
    },
  };
}

async function prepareOperation(input: {
  kind: 'deposit' | 'transfer' | 'withdraw';
  intent: StellarIntent;
  storage: StellarStorageAdapter;
  engine: StellarTransactEngine;
}): Promise<StellarPreparedOperation> {
  const consumedRecords =
    input.kind === 'deposit'
      ? []
      : await selectPrivateRecords({
          storage: input.storage,
          owner: input.intent.from,
          asset: input.intent.asset,
          amount: input.intent.amount,
        });

  const consumedTotal = sumRecordAmounts(consumedRecords);

  const prepared: StellarPreparedOperation = {
    kind: input.kind,
    intent: input.intent,
    consumedRecords,
    outputRecords: buildOutputRecords(input.kind, input.intent, consumedTotal),
    submissionPayload: {
      operationId: crypto.randomUUID(),
      signed: false,
    },
  };

  return input.engine.prepare(prepared);
}

async function selectPrivateRecords(input: {
  storage: StellarStorageAdapter;
  owner: StellarAddress;
  asset: StellarAssetId;
  amount: bigint;
}): Promise<StellarPrivateRecord[]> {
  const records = await input.storage.listPrivateRecords({
    owner: input.owner,
    asset: input.asset,
  });
  const available = records
    .filter((record) => !record.consumed)
    .toSorted((left, right) => left.id.localeCompare(right.id));

  if (available.length === 0) {
    throw insufficientStateError(
      'missing_private_records',
      'Storage does not contain enough private records for this operation.',
      { requestedAmount: input.amount, availableAmount: 0n },
    );
  }

  let selectedTotal = 0n;
  const selected: StellarPrivateRecord[] = [];
  for (const record of available) {
    selected.push(record);
    selectedTotal += record.amount;
    if (selectedTotal >= input.amount) {
      return selected;
    }
  }

  throw insufficientStateError(
    'missing_private_records',
    'Storage does not contain enough private records for this operation.',
    { requestedAmount: input.amount, availableAmount: selectedTotal },
  );
}

function sumRecordAmounts(records: StellarPrivateRecord[]): bigint {
  return records.reduce((total, record) => total + record.amount, 0n);
}

function buildOutputRecords(
  kind: 'deposit' | 'transfer' | 'withdraw',
  intent: StellarIntent,
  consumedTotal: bigint,
): StellarPrivateRecord[] {
  if (kind === 'deposit') {
    return [createOutputRecord(intent.to, intent.asset, intent.amount)];
  }

  const changeAmount = consumedTotal - intent.amount;
  const outputs: StellarPrivateRecord[] = [];

  if (kind === 'withdraw' && intent.disclosure.recipientAddress === 'public') {
    if (changeAmount > 0n) {
      outputs.push(createOutputRecord(intent.from, intent.asset, changeAmount));
    }
    return outputs;
  }

  outputs.push(createOutputRecord(intent.to, intent.asset, intent.amount));
  if (changeAmount > 0n) {
    outputs.push(createOutputRecord(intent.from, intent.asset, changeAmount));
  }
  return outputs;
}

function createOutputRecord(
  owner: StellarAddress,
  asset: StellarAssetId,
  amount: bigint,
): StellarPrivateRecord {
  return {
    id: crypto.randomUUID(),
    owner,
    asset,
    amount,
    consumed: false,
  };
}
