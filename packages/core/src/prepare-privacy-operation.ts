import type { PrivacyClientAdapters } from './adapters.js';
import {
  invalidIntentError,
  isPrivacySdkError,
  missingDependencyError,
  type PrivacySdkError,
} from './errors.js';
import type { IntentForKind, OperationIntent, OperationKind } from './intents.js';
import {
  createPreparedOperation,
  createRejectedOperation,
  type OperationResult,
} from './operations.js';
import {
  collectMissingDependencies,
  prepareWithNetwork,
  validatePolicy,
} from './privacy-operation-validation.js';

function validateIntentAmount<TAmount>(
  amount: TAmount,
  errors: PrivacySdkError[],
): void {
  if (typeof amount === 'bigint' && amount <= 0n) {
    errors.push(invalidIntentError('amount', 'Amount must be greater than zero.'));
  }
}

export async function preparePrivacyOperation<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TSignedPayload,
  TPrivateRecord,
  TPrepared,
  TReceipt,
>(
  kind: TKind,
  intent: OperationIntent<TAddress, TAsset, TAmount>,
  adapters: PrivacyClientAdapters<
    TAddress,
    TAsset,
    TAmount,
    TSignedPayload,
    TPrivateRecord,
    TPrepared,
    TReceipt
  >,
): Promise<OperationResult<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt>> {
  const rejected = validateOperationRequest(kind, intent, adapters);
  if (rejected !== undefined) {
    return rejected;
  }

  const policy = adapters.policy;
  const network = adapters.network;
  if (policy === undefined || network === undefined) {
    return createRejectedOperation([
      missingDependencyError('network', 'Missing network adapter.'),
    ]);
  }

  const policyErrors = await validatePolicy(kind, intent, policy);
  if (policyErrors.length > 0) {
    return createRejectedOperation(policyErrors);
  }

  return finalizePreparedOperation(kind, intent, network);
}

function validateOperationRequest<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TSignedPayload,
  TPrivateRecord,
  TPrepared,
  TReceipt,
>(
  kind: TKind,
  intent: OperationIntent<TAddress, TAsset, TAmount>,
  adapters: PrivacyClientAdapters<
    TAddress,
    TAsset,
    TAmount,
    TSignedPayload,
    TPrivateRecord,
    TPrepared,
    TReceipt
  >,
): OperationResult<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt> | undefined {
  const validationErrors: PrivacySdkError[] = [];
  validateIntentAmount(intent.amount, validationErrors);
  if (validationErrors.length > 0) {
    return createRejectedOperation(validationErrors);
  }

  const requiredAdapters: Array<
    keyof PrivacyClientAdapters<
      TAddress,
      TAsset,
      TAmount,
      TSignedPayload,
      TPrivateRecord,
      TPrepared,
      TReceipt
    >
  > = ['network', 'policy'];
  if (kind !== 'deposit') {
    requiredAdapters.push('storage');
  }

  const dependencyErrors = collectMissingDependencies(adapters, requiredAdapters);
  if (dependencyErrors.length > 0) {
    return createRejectedOperation(dependencyErrors);
  }

  return undefined;
}

async function finalizePreparedOperation<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
  TSignedPayload,
  TPrivateRecord,
  TPrepared,
  TReceipt,
>(
  kind: TKind,
  intent: OperationIntent<TAddress, TAsset, TAmount>,
  network: NonNullable<
    PrivacyClientAdapters<
      TAddress,
      TAsset,
      TAmount,
      TSignedPayload,
      TPrivateRecord,
      TPrepared,
      TReceipt
    >['network']
  >,
): Promise<OperationResult<TKind, TAddress, TAsset, TAmount, TPrepared, TReceipt>> {
  try {
    const prepared = await prepareWithNetwork(kind, intent, network);
    return createPreparedOperation(
      kind,
      intent as IntentForKind<TKind, TAddress, TAsset, TAmount>,
      prepared,
      (options) => network.submit(prepared, options),
    );
  } catch (error) {
    if (isPrivacySdkError(error)) {
      return createRejectedOperation([error]);
    }
    throw error;
  }
}
