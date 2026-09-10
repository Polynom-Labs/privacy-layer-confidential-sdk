import {
  PrivacyPoolSDK,
  decodeDecodedEphemeralKey,
  randomFrDecimal253,
  scalarHexToFrDecimal,
  type CoinData,
  type StateFile,
} from '@arcanetech/stellar-privacy-pool-zk-sdk';
import { merkleRootBufferToFrDecimal } from '../merkle/field-decimal.js';
import {
  privateAddressSdk,
  recipientPublicKeysDecimalFromPrivateAddress,
  type SpendScalarDomain,
} from '../private-address/codec.js';
import {
  proveWithdrawTransact,
  proveWithdrawTransactDual,
} from '../proofs/withdraw/transact-proof.js';
import { Buffer } from 'buffer';
import {
  buildPublicDepositLegs,
  withTokenAddressPublicInputs,
} from '../proofs/transaction-input.js';
import {
  buildPoolTransactionAuditParameters,
  resolvePoolApplicationId,
} from '../audit/parameters.js';
import type { StellarBrowserAssets } from '../../types.js';
import {
  materializeSelectedZkCircuit,
  optionalZkArtifactBaseUrl,
  type StellarZkCircuitDefinition,
} from '../zk/circuit-config.js';
import { DEFAULT_ZK_CONFIG_NONCE } from '../environment/zk-config-nonce.js';
import {
  buildApplicationIdHints,
  padDepositSlotsToLayout,
  padPublicLegsToLayout,
  padWithdrawSlotsToLayout,
} from '../zk/slots.js';
import type {
  AlignedDepositSlot,
  ProofResult,
  ProofWithChange,
} from '../pool/proof-types.js';
import { buildAlignedDepositSlotForSdk } from '../pool/aligned-deposit.js';

export class PrivacyPoolService {
  private sdk: PrivacyPoolSDK | undefined = undefined;
  private initPromise: Promise<void> | undefined = undefined;

  constructor(
    private readonly assets?: StellarBrowserAssets,
    private readonly applicationId?: string,
    private readonly auditPublicKey?: [string, string],
    private readonly zkCircuits?: Record<string, StellarZkCircuitDefinition>,
    private readonly zkConfigNonce?: bigint,
    private readonly zkArtifactBaseUrl?: string,
  ) {}

  private async ensureInit(): Promise<void> {
    if (this.sdk) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      if (!this.assets) {
        throw new Error(
          'PrivacyPoolService requires browser ZK assets before initialization.',
        );
      }
      const zkConfigNonce = this.zkConfigNonce ?? DEFAULT_ZK_CONFIG_NONCE;
      const zkCircuits = await materializeSelectedZkCircuit(
        this.zkCircuits,
        zkConfigNonce,
      );
      this.sdk = await PrivacyPoolSDK.init({
        wasmBinary: this.assets.sdkWasm,
        zkCircuits,
        zkConfigNonce,
        ...optionalZkArtifactBaseUrl(this.zkArtifactBaseUrl),
      });
    })();
    return this.initPromise;
  }

  async getInitializedSdk(): Promise<PrivacyPoolSDK> {
    await this.ensureInit();
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }
    return this.sdk;
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
  }): Promise<ProofResult> {
    const sdk = await this.getInitializedSdk();
    const stateRoot = merkleRootBufferToFrDecimal(parameters.merkleRootBytes);
    const recipientPublicKeys = recipientPublicKeysDecimalFromPrivateAddress(
      parameters.privateAddressStpl1,
    ) as [string, string];
    const applicationId = this.getApplicationId();
    const audit = buildPoolTransactionAuditParameters({
      applicationId,
      nAuditSlots: sdk.getLayout().nAuditSlots,
      ...(this.auditPublicKey ? { auditPublicKey: this.auditPublicKey } : {}),
    });
    const deposit = {
      value: parameters.coin.value,
      nullifier: parameters.coin.nullifier,
      ephemeralKeyScalar: scalarHexToFrDecimal(parameters.depositScalarHex),
      asset: [parameters.coin.asset_hi, parameters.coin.asset_lo] as [string, string],
      applicationId,
      recipientPublicKeys,
    };
    const publicInput = withTokenAddressPublicInputs(
      {
        stateRoot,
        privKeyScalar: randomFrDecimal253(),
      },
      parameters.tokenAddress,
    );
    const proof = await sdk.proveTransaction(
      publicInput as unknown as Parameters<typeof sdk.proveTransaction>[0],
      padPublicLegsToLayout(
        sdk,
        buildPublicDepositLegs(parameters.tokenAddress, parameters.coin.value),
      ),
      padWithdrawSlotsToLayout(sdk, []),
      padDepositSlotsToLayout(sdk, [deposit]),
      audit,
    );
    const applicationIdsPlaintext = buildApplicationIdHints({
      sdk,
      inputIds: [],
      outputIds: [applicationId],
    });
    return { ...proof, applicationIdsPlaintext };
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
  }): Promise<ProofWithChange> {
    const sdk = await this.getInitializedSdk();
    return proveWithdrawTransact({
      sdk,
      applicationId: this.getApplicationId(),
      buildAlignedDepositSlot: (input) => this.buildAlignedDepositSlot(input),
      ...(this.auditPublicKey ? { auditPublicKey: this.auditPublicKey } : {}),
      ...parameters,
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
  }): Promise<ProofWithChange> {
    const sdk = await this.getInitializedSdk();
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
    });
  }
}
