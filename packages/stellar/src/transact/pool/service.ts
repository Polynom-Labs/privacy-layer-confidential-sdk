import {
  PrivacyPoolSDK,
  decodeDecodedEphemeralKey,
  type CoinData,
  type StateFile,
} from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { privateAddressSdk, type SpendScalarDomain } from '../private-address/codec.js';
import {
  proveWithdrawTransact,
  proveWithdrawTransactDual,
} from '../proofs/withdraw/transact-proof.js';
import { Buffer } from 'buffer';
import { resolvePoolApplicationId } from '../audit/parameters.js';
import type { StellarBrowserAssets } from '../../types.js';
import {
  optionalZkArtifactBaseUrl,
  type StellarZkCircuitDefinition,
} from '../zk/circuit-config.js';
import { DEFAULT_ZK_CONFIG_NONCE } from '../environment/zk-config-nonce.js';
import type {
  AlignedDepositSlot,
  ProofResult,
  ProofWithChange,
} from '../pool/proof-types.js';
import { buildAlignedDepositSlotForSdk } from '../pool/aligned-deposit.js';
import { initializePrivacyPoolSdk } from '../pool/initialize-sdk.js';
import type { FeeOutputSpec } from '../fees/append-fee-output.js';
import { zkConfigNonceForFeeBearingKind } from '../fees/zk-config-nonce-for-kind.js';
import { proveDepositTransact } from '../pool/prepare-deposit-proof.js';

export class PrivacyPoolService {
  private readonly sdks = new Map<string, PrivacyPoolSDK>();
  private readonly initPromises = new Map<string, Promise<PrivacyPoolSDK>>();

  constructor(
    private readonly assets?: StellarBrowserAssets,
    private readonly applicationId?: string,
    private readonly auditPublicKey?: [string, string],
    private readonly zkCircuits?: Record<string, StellarZkCircuitDefinition>,
    private readonly zkConfigNonce?: bigint,
    private readonly zkArtifactBaseUrl?: string,
  ) {}

  async getInitializedSdk(nonce?: bigint): Promise<PrivacyPoolSDK> {
    const zkConfigNonce = nonce ?? this.zkConfigNonce ?? DEFAULT_ZK_CONFIG_NONCE;
    const key = zkConfigNonce.toString();
    const existing = this.sdks.get(key);
    if (existing) {
      return existing;
    }
    const pending = this.initPromises.get(key);
    if (pending) {
      return pending;
    }
    const started = this.initializeSdk(zkConfigNonce);
    this.initPromises.set(key, started);
    try {
      const sdk = await started;
      this.sdks.set(key, sdk);
      return sdk;
    } finally {
      this.initPromises.delete(key);
    }
  }

  private async initializeSdk(nonce: bigint): Promise<PrivacyPoolSDK> {
    if (!this.assets) {
      throw new Error(
        'PrivacyPoolService requires browser ZK assets before initialization.',
      );
    }
    return initializePrivacyPoolSdk(
      {
        assets: this.assets,
        ...(this.zkCircuits ? { zkCircuits: this.zkCircuits } : {}),
        ...(this.zkConfigNonce === undefined
          ? {}
          : { zkConfigNonce: this.zkConfigNonce }),
        ...optionalZkArtifactBaseUrl(this.zkArtifactBaseUrl),
      },
      nonce,
    );
  }

  getAuditPublicKey(): [string, string] | undefined {
    return this.auditPublicKey;
  }

  getApplicationId(): string {
    return resolvePoolApplicationId(this.applicationId);
  }

  async generatePrivateAddressFromStellarSignature(
    signature: string,
    domain: SpendScalarDomain,
  ): Promise<string> {
    const sdk = await this.getInitializedSdk();
    return privateAddressSdk(sdk).generatePrivateAddressFromStellarSignature(
      signature,
      domain,
    );
  }

  async sharedSecretX(
    recipientScalarHex: string,
    ephemeralKeyEncoded: string,
  ): Promise<string> {
    const sdk = await this.getInitializedSdk();
    const ephemeralKey = decodeDecodedEphemeralKey(ephemeralKeyEncoded);
    const shared = sdk.sharedSecretFromRecipientPreimage({
      recipientScalar: recipientScalarHex,
      ephemeralKey,
    });
    return shared.x;
  }

  async buildAlignedDepositSlot(parameters: {
    privateAddressStpl1: string;
    amountStroops: bigint;
    tokenAddress: string;
    escrowNonce?: string;
    recipientHi?: string;
    recipientLo?: string;
  }) {
    const sdk = await this.getInitializedSdk();
    return buildAlignedDepositSlotForSdk(sdk, this.getApplicationId(), parameters);
  }

  async createAlignedShieldCoinData(parameters: {
    privateAddressStpl1: string;
    amountStroops: bigint;
    tokenAddress: string;
  }): Promise<Omit<AlignedDepositSlot, 'deposit'>> {
    const { commitment_hex, coin, depositScalarHex, precommitementHex } =
      await this.buildAlignedDepositSlot(parameters);
    return { commitment_hex, coin, depositScalarHex, precommitementHex };
  }

  async prepareDepositTransactProof(parameters: {
    privateAddressStpl1: string;
    coin: CoinData;
    depositScalarHex: string;
    merkleRootBytes: Buffer;
    tokenAddress: string;
    publicDepositStroops?: bigint;
    feeOutput?: FeeOutputSpec;
  }): Promise<ProofResult> {
    const sdk = await this.getInitializedSdk(
      zkConfigNonceForFeeBearingKind({ kind: 'deposit' }),
    );
    return proveDepositTransact({
      sdk,
      applicationId: this.getApplicationId(),
      privateAddressStpl1: parameters.privateAddressStpl1,
      coin: parameters.coin,
      depositScalarHex: parameters.depositScalarHex,
      merkleRootBytes: parameters.merkleRootBytes,
      tokenAddress: parameters.tokenAddress,
      buildAlignedDepositSlot: (input) => this.buildAlignedDepositSlot(input),
      ...(this.auditPublicKey ? { auditPublicKey: this.auditPublicKey } : {}),
      ...(parameters.publicDepositStroops === undefined
        ? {}
        : { publicDepositStroops: parameters.publicDepositStroops }),
      ...(parameters.feeOutput ? { feeOutput: parameters.feeOutput } : {}),
    });
  }

  async calculateNullifierHash(
    nullifier: string,
    privKeyScalar: string,
  ): Promise<string> {
    const sdk = await this.getInitializedSdk();
    return sdk.calculateNullifierHash(nullifier, privKeyScalar);
  }
  async prepareWithdrawTransactProof(parameters: {
    coin: CoinData;
    state: StateFile;
    destinationStellarAddress: string;
    privKeyScalarHex: string;
    depositorEphemeralKey: string;
    withdrawAmountStroops: bigint;
    changePrivateAddressStpl1: string | undefined;
    tokenAddress: string;
    feeOutput?: FeeOutputSpec;
  }): Promise<ProofWithChange> {
    const sdk = await this.getInitializedSdk(
      zkConfigNonceForFeeBearingKind({ kind: 'withdraw' }),
    );
    return proveWithdrawTransact({
      sdk,
      applicationId: this.getApplicationId(),
      buildAlignedDepositSlot: (input) => this.buildAlignedDepositSlot(input),
      ...(this.auditPublicKey ? { auditPublicKey: this.auditPublicKey } : {}),
      coin: parameters.coin,
      state: parameters.state,
      destinationStellarAddress: parameters.destinationStellarAddress,
      privKeyScalarHex: parameters.privKeyScalarHex,
      depositorEphemeralKey: parameters.depositorEphemeralKey,
      withdrawAmountStroops: parameters.withdrawAmountStroops,
      changePrivateAddressStpl1: parameters.changePrivateAddressStpl1,
      tokenAddress: parameters.tokenAddress,
      ...(parameters.feeOutput ? { feeOutput: parameters.feeOutput } : {}),
    });
  }
  async prepareWithdrawTransactProofDual(parameters: {
    coinA: CoinData;
    coinB: CoinData;
    state: StateFile;
    destinationStellarAddress: string;
    privKeyScalarHex: string;
    depositorEphemeralAKey: string;
    depositorEphemeralBKey: string;
    withdrawAmountStroops: bigint;
    changePrivateAddressStpl1: string | undefined;
    tokenAddress: string;
    feeOutput?: FeeOutputSpec;
  }): Promise<ProofWithChange> {
    const sdk = await this.getInitializedSdk(
      zkConfigNonceForFeeBearingKind({ kind: 'withdraw' }),
    );
    return proveWithdrawTransactDual({
      sdk,
      applicationId: this.getApplicationId(),
      buildAlignedDepositSlot: (input) => this.buildAlignedDepositSlot(input),
      ...(this.auditPublicKey ? { auditPublicKey: this.auditPublicKey } : {}),
      coinA: parameters.coinA,
      coinB: parameters.coinB,
      state: parameters.state,
      destinationStellarAddress: parameters.destinationStellarAddress,
      privKeyScalarHex: parameters.privKeyScalarHex,
      ephemeralAKey: parameters.depositorEphemeralAKey,
      ephemeralBKey: parameters.depositorEphemeralBKey,
      withdrawAmountStroops: parameters.withdrawAmountStroops,
      changePrivateAddressStpl1: parameters.changePrivateAddressStpl1,
      tokenAddress: parameters.tokenAddress,
      ...(parameters.feeOutput ? { feeOutput: parameters.feeOutput } : {}),
    });
  }
}
