import type { AuditPublicKey } from '@auditable/privacy-pool-zk-sdk';
import type { StellarAssetId, StellarNetworkConfig } from '../../types.js';
import type { OnboardingPayload } from '../onboarding/payload.js';
import type {
  LeafEphemeralStatePort,
  PoolMerkleStatePort,
} from '../merkle/state-port.js';
import type { StellarSignTransaction } from '../../contracts/signing.js';

export interface TransferTemporaryRecipientKey {
  temporaryScalarHex: string;
  temporaryPrivateAddressStpl1: string;
}

export interface TransferOnboardingRecipientNoteInput {
  tokenAddress: string;
  nullifier: string;
  secret: string;
  value: string;
}

export interface TransferRecipientExecutionContext {
  recipientPrivateAddressStpl1: string;
  recipientStellarAddress?: string;
  temporaryRecipientKey?: TransferTemporaryRecipientKey;
}

export interface BuildTransferOnboardingAtExecuteInput {
  ownerStellarAddress: string;
  temporaryRecipientKey: TransferTemporaryRecipientKey;
  recipientNote: TransferOnboardingRecipientNoteInput;
}

export interface StellarKytEnvironment {
  apiBaseUrl: string;
  kytPassageRegistryContract: string;
  registerPassageOnChain?: boolean;
}

export interface StellarTransactEnvironment {
  network: StellarNetworkConfig;
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
  buildTransferOnboardingAtExecute?: (
    input: BuildTransferOnboardingAtExecuteInput,
  ) => Promise<OnboardingPayload>;
  resolveWalletPublicKey?: () => Promise<string>;
  poolMerkleState?: PoolMerkleStatePort;
  leafEphemeral?: LeafEphemeralStatePort;
}
