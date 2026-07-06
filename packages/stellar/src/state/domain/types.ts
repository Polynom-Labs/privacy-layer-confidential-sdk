import type { StellarAddress, StellarAssetId } from '../../types.js';

export type StellarPrivateRecordStatus = 'pending' | 'finalized' | 'spent';

export interface StellarPrivateCoinNote {
  value: string;
  nullifier: string;
  secret: string;
  commitment: string;
  asset_hi: string;
  asset_lo: string;
  application_id?: string;
}

export type StellarRegistryStatus = 'registered' | 'unregistered';

export type StellarTrustlineStatus = 'active' | 'inactive' | 'none';

export type StellarTransactionConfirmationStatus = 'pending' | 'success' | 'failed';

export interface StellarAsset {
  id: number;
  assetId: StellarAssetId;
  name: string;
  logoUrl: string | null;
  issuerAddress: string | null;
  clientContract: string | null;
  poolContracts: string[];
  poolContract: string;
  mintable: boolean;
  mintAmount: string | null;
  decimals?: number | null;
}

export interface StellarAssetsCatalog {
  byId: Record<StellarAssetId, StellarAsset>;
  listOrder: StellarAssetId[];
}

export interface StellarPublicBalance {
  owner: StellarAddress;
  asset: StellarAssetId;
  balance: string;
  trustlineStatus: StellarTrustlineStatus;
}

export interface StellarRegistryLookup {
  owner: StellarAddress;
  status: StellarRegistryStatus;
  privateAddressStpl1?: string;
  publicKeyXHex?: string;
  publicKeyYHex?: string;
  updatedAtLedger?: number;
  cachedAt?: string;
}

export interface StellarWalletPrivateAddressScalar {
  owner: StellarAddress;
  nonce: string;
  scalarHex: string;
  updatedAt?: string;
}

export interface StellarWalletPrivateAddressRecord {
  owner: StellarAddress;
  nonce: string;
  privateAddress: string;
  createdAt: number;
}

export interface StellarPoolMerkleState {
  poolContract: string;
  commitments: string[];
  commitmentCount: number;
  merkleRootHex: string;
  updatedAt: number;
  syncedLedger?: number;
}

export interface StellarLeafEphemeral {
  poolContract: string;
  leafIndex: number;
  xHex: string;
  yHex: string;
  cachedAt?: string;
}

export interface StellarPendingClaim {
  id: string;
  owner: StellarAddress;
  asset: StellarAssetId;
  amount: bigint;
  createdAt: string;
  poolTxId?: string;
  commitmentHex?: string;
  nullifierHex?: string;
  futureNullifierHashHex?: string;
  assetHiHex?: string;
  assetLoHex?: string;
  nullifierFieldHex?: string;
  secretHex?: string;
  tempPublicKeyXHex?: string;
  tempPublicKeyYHex?: string;
  encryptedRecoveryBase64?: string;
  createdAtLedger?: number;
}

export interface StellarPendingClaimsPagination {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface StellarPendingClaimsState {
  items: StellarPendingClaim[];
  pagination?: StellarPendingClaimsPagination;
}

export interface StellarIncomingDelivery {
  id: number;
  privateAddress: string;
  asset: StellarAssetId;
  ciphertextBase64: string;
  ephemeralKey: string;
  tagBase64: string;
  createdAt: string;
  processed?: boolean;
}

export interface StellarDeliverySyncState {
  privateAddress: string;
  asset: StellarAssetId;
  bloomM: number;
  bloomK: number;
  bloomBitsBase64?: string;
  lastPage?: number;
  lastPolledAt?: string;
}

export interface StellarPrivateRecord {
  id: string;
  owner: StellarAddress;
  asset: StellarAssetId;
  amount: bigint;
  consumed: boolean;
  status?: StellarPrivateRecordStatus;
  poolContract?: string;
  commitmentHex?: string;
  nullifierHex?: string;
  amountDisplay?: number;
  deliveryId?: number;
  privateAddress?: string;
  txHash?: string;
  coinNote?: StellarPrivateCoinNote;
  depositScalarHex?: string;
  precommitementHex?: string;
}

export interface StellarPrivateAssetRow {
  assetId: StellarAssetId;
  poolContract: string;
  totalAmount: bigint;
  totalAmountDisplay: number;
}

export interface StellarTransactionStatus {
  txHash: string;
  status: StellarTransactionConfirmationStatus;
  ledger?: number;
  createdAt?: string;
}

export interface StellarAvailablePrivateRecordsFilter {
  owner?: StellarAddress;
  privateAddress?: string;
  asset?: StellarAssetId;
}

export interface StellarPendingClaimsFilter {
  owner?: StellarAddress;
  asset?: StellarAssetId;
}

export interface StellarIncomingDeliveriesFilter {
  privateAddress: string;
  asset?: StellarAssetId;
  includeProcessed?: boolean;
}
