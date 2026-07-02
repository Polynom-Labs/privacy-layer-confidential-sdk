import type { OperationKind } from '@arcane/privacy-sdk-core';
import type {
  DepositIntent,
  TransferIntent,
  WithdrawIntent,
} from '@arcane/privacy-sdk-core';

export type StellarAddress = string;
export type StellarAssetId = string;

export interface StellarPrivateRecord {
  id: string;
  owner: StellarAddress;
  asset: StellarAssetId;
  amount: bigint;
  consumed: boolean;
}

export interface StellarPreparedOperation {
  kind: OperationKind;
  intent:
    | DepositIntent<StellarAddress, StellarAssetId, bigint>
    | TransferIntent<StellarAddress, StellarAssetId, bigint>
    | WithdrawIntent<StellarAddress, StellarAssetId, bigint>;
  consumedRecords: StellarPrivateRecord[];
  outputRecords: StellarPrivateRecord[];
  submissionPayload: StellarSubmissionPayload;
}

export interface StellarSubmissionPayload {
  operationId: string;
  signed: boolean;
}

export interface StellarOperationReceipt {
  operationId: string;
  confirmed: boolean;
}

export interface StellarNetworkConfig {
  id: string;
  rpcUrl: string;
  networkPassphrase: string;
  poolContract: string;
  registryContract: string;
  applicationId: string;
}

export interface StellarBrowserAssets {
  sdkWasm: ArrayBuffer;
  circuitWasm: ArrayBuffer;
  provingKey: ArrayBuffer;
}

export interface StellarWalletAdapter {
  getAddress(): Promise<StellarAddress>;
  authorizeMessage(message: Uint8Array | string): Promise<Uint8Array>;
  signTransactionPayload(
    payload: StellarSubmissionPayload,
  ): Promise<StellarSubmissionPayload>;
}

export interface StellarStorageAdapter {
  listPrivateRecords(filter: {
    owner: StellarAddress;
    asset?: StellarAssetId;
    amount?: bigint;
  }): Promise<StellarPrivateRecord[]>;
  savePrivateRecords(records: StellarPrivateRecord[]): Promise<void>;
  markPrivateRecordsUsed(records: StellarPrivateRecord[]): Promise<void>;
}

export interface StellarPolicyAdapter {
  inspectOperation(
    kind: OperationKind,
    intent:
      | DepositIntent<StellarAddress, StellarAssetId, bigint>
      | TransferIntent<StellarAddress, StellarAssetId, bigint>
      | WithdrawIntent<StellarAddress, StellarAssetId, bigint>,
  ): Promise<void>;
}

export interface StellarTransactEngine {
  prepare(prepared: StellarPreparedOperation): Promise<StellarPreparedOperation>;
  submit(
    prepared: StellarPreparedOperation,
    signedPayload: StellarSubmissionPayload,
  ): Promise<StellarOperationReceipt>;
}

export interface StellarPrivacyClientConfigBase {
  network: StellarNetworkConfig;
  wallet: StellarWalletAdapter;
  storage: StellarStorageAdapter;
  policy?: StellarPolicyAdapter;
  transactEngine?: StellarTransactEngine;
}

export interface StellarBrowserPrivacyClientConfig extends StellarPrivacyClientConfigBase {
  assets: StellarBrowserAssets;
}

/** Browser entrypoint config alias. */
export type StellarPrivacyClientConfig = StellarBrowserPrivacyClientConfig;

export interface ResolvedStellarPrivacyClientConfig extends Omit<
  StellarPrivacyClientConfigBase,
  'transactEngine'
> {
  transactEngine: StellarTransactEngine;
}
