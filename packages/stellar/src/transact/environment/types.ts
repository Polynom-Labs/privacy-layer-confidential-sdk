import type { AuditPublicKey } from '@auditable/privacy-pool-zk-sdk';
import type { StellarAssetId, StellarNetworkConfig } from '../../types.js';
import type {
  LeafEphemeralStatePort,
  PoolMerkleStatePort,
} from '../merkle/state-port.js';
import type { StellarSignTransaction } from '../../contracts/signing.js';

export interface TransferTemporaryRecipientKey {
  temporaryScalarHex: string;
  temporaryPrivateAddressStpl1: string;
}

export interface TransferEscrowSend {
  nonceDecimal: string;
  recipientHi: string;
  recipientLo: string;
  recipientStellarAddress: string;
}

export interface TransferEscrowClaimantLimbs {
  recipientHi: string;
  recipientLo: string;
  nonceDecimal?: string;
}

export interface TransferRecipientExecutionContext {
  recipientPrivateAddressStpl1: string;
  recipientStellarAddress?: string;
  escrowSend?: TransferEscrowSend;
  temporaryRecipientKey?: TransferTemporaryRecipientKey;
}

export interface StellarKytEnvironment {
  apiBaseUrl: string;
  kytPassageRegistryContract: string;
  registerPassageOnChain?: boolean;
  inspectAuthorization?: string;
}

export interface StellarTransactEnvironment {
  network: StellarNetworkConfig;
  /**
   * Nonce (persistent storage key) of the pool's `ZkConfig` entry this
   * environment's proofs/circuit shape target. Defaults to `2n` (Commitment
   * V2, 95 public signals) when omitted. Nonce `0` is the retired 93-signal
   * layout and must be passed explicitly.
   */
  zkConfigNonce?: bigint;
  auditPublicKey?: AuditPublicKey;
  kyt: StellarKytEnvironment;
  signTransaction?: StellarSignTransaction;
  resolveTokenContractId?: (assetId: StellarAssetId) => string | Promise<string>;
  resolveSenderPrivKeyScalarHex?: (privateAddressStpl1: string) => Promise<string>;
  readSenderPrivKeyScalarHex?: (
    privateAddressStpl1: string,
  ) => Promise<string | undefined>;
  ensureSenderPrivKeyScalarHex?: (privateAddressStpl1: string) => Promise<string>;
  resolveSenderPrivKeyScalarFromState?: (input: {
    owner: string;
    privateAddressStpl1: string;
  }) => Promise<string | undefined>;
  resolveTransferRecipientAtExecute?: (input: {
    recipientStellarAddress: string;
    walletPublicKey: string;
  }) => Promise<TransferRecipientExecutionContext>;
  resolveWalletPublicKey?: () => Promise<string>;
  poolMerkleState?: PoolMerkleStatePort;
  leafEphemeral?: LeafEphemeralStatePort;
}
