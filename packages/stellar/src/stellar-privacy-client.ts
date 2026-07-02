import {
  AdapterPrivacyClient,
  createRejectedOperation,
  type OperationResult,
  PrivacyClient,
  type DepositIntent,
  type TransferIntent,
  type WithdrawIntent,
} from '@arcane/privacy-sdk-core';
import {
  createStellarNetworkAdapter,
  createStellarPolicyAdapter,
} from './stellar-adapters.js';
import type {
  ResolvedStellarPrivacyClientConfig,
  StellarAddress,
  StellarAssetId,
  StellarOperationReceipt,
  StellarPreparedOperation,
  StellarPrivacyClientConfigBase,
  StellarPrivateRecord,
  StellarTransactEngine,
} from './types.js';
import { validateStellarConfig } from './validate-config.js';

export class StellarPrivacyClient extends PrivacyClient<
  StellarAddress,
  StellarAssetId,
  bigint,
  StellarPreparedOperation,
  StellarOperationReceipt
> {
  private readonly delegate: AdapterPrivacyClient<
    StellarAddress,
    StellarAssetId,
    bigint,
    StellarPreparedOperation['submissionPayload'],
    StellarPrivateRecord,
    StellarPreparedOperation,
    StellarOperationReceipt
  >;

  constructor(config: ResolvedStellarPrivacyClientConfig) {
    super();
    this.delegate = new AdapterPrivacyClient({
      wallet: {
        getAddress: () => config.wallet.getAddress(),
        authorizeMessage: (message) => config.wallet.authorizeMessage(message),
        authorizePayload: (payload) => config.wallet.signTransactionPayload(payload),
      },
      storage: config.storage,
      network: createStellarNetworkAdapter({
        storage: config.storage,
        wallet: config.wallet,
        engine: config.transactEngine,
      }),
      policy: createStellarPolicyAdapter(config.policy),
    });
  }

  deposit(
    intent: DepositIntent<StellarAddress, StellarAssetId, bigint>,
  ): Promise<
    OperationResult<
      'deposit',
      StellarAddress,
      StellarAssetId,
      bigint,
      StellarPreparedOperation,
      StellarOperationReceipt
    >
  > {
    return this.delegate.deposit(intent);
  }

  transfer(
    intent: TransferIntent<StellarAddress, StellarAssetId, bigint>,
  ): Promise<
    OperationResult<
      'transfer',
      StellarAddress,
      StellarAssetId,
      bigint,
      StellarPreparedOperation,
      StellarOperationReceipt
    >
  > {
    return this.delegate.transfer(intent);
  }

  withdraw(
    intent: WithdrawIntent<StellarAddress, StellarAssetId, bigint>,
  ): Promise<
    OperationResult<
      'withdraw',
      StellarAddress,
      StellarAssetId,
      bigint,
      StellarPreparedOperation,
      StellarOperationReceipt
    >
  > {
    return this.delegate.withdraw(intent);
  }
}

export async function resolveStellarPrivacyClientConfig<
  TConfig extends StellarPrivacyClientConfigBase,
>(
  config: TConfig,
  createEngine: (config: TConfig) => Promise<StellarTransactEngine>,
): Promise<
  | { ok: true; config: ResolvedStellarPrivacyClientConfig & TConfig }
  | { ok: false; result: ReturnType<typeof createRejectedOperation> }
> {
  const errors = validateStellarConfig(config);
  if (errors.length > 0) {
    return { ok: false, result: createRejectedOperation(errors) };
  }

  const transactEngine = config.transactEngine ?? (await createEngine(config));

  return {
    ok: true,
    config: {
      ...config,
      transactEngine,
    },
  };
}

export function createStellarPrivacyClientFromResolvedConfig(
  config: ResolvedStellarPrivacyClientConfig,
): StellarPrivacyClient {
  return new StellarPrivacyClient(config);
}

export type { ResolvedStellarPrivacyClientConfig } from './types.js';
