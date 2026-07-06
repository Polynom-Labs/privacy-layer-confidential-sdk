import { type StateBridgeDefinition } from '@arcane/privacy-sdk-core/state';
import type { StellarAddress, StellarAssetId } from '../../types.js';

export const stellarStateCallTypes = {
  pendingClaims: 'pendingClaims',
  clearPendingClaims: 'clearPendingClaims',
  readPendingClaims: 'readPendingClaims',
  replacePendingClaimsPage: 'replacePendingClaimsPage',
  upsertPendingClaims: 'upsertPendingClaims',
  removePendingClaims: 'removePendingClaims',
  setPendingClaimsCount: 'setPendingClaimsCount',
  readPendingClaimsCount: 'readPendingClaimsCount',
  readStellarAddressRegistered: 'readStellarAddressRegistered',
  readCachedPrivateAddress: 'readCachedPrivateAddress',
  readRegistryLookup: 'readRegistryLookup',
  saveRegisteredPrivateAddress: 'saveRegisteredPrivateAddress',
  saveRegistryLookup: 'saveRegistryLookup',
  invalidateRegisteredAddress: 'invalidateRegisteredAddress',
  invalidateRegistryLookup: 'invalidateRegistryLookup',
  readAssetsCatalog: 'readAssetsCatalog',
  readAsset: 'readAsset',
  replaceAssets: 'replaceAssets',
  upsertAssets: 'upsertAssets',
  readPublicBalance: 'readPublicBalance',
  readPublicBalances: 'readPublicBalances',
  setPublicBalance: 'setPublicBalance',
  setPublicBalances: 'setPublicBalances',
  readPoolMerkleState: 'readPoolMerkleState',
  setPoolMerkleState: 'setPoolMerkleState',
  readLeafEphemeral: 'readLeafEphemeral',
  setLeafEphemeral: 'setLeafEphemeral',
  listPrivateRecords: 'listPrivateRecords',
  savePrivateRecords: 'savePrivateRecords',
  replacePrivateRecords: 'replacePrivateRecords',
  upsertPrivateRecords: 'upsertPrivateRecords',
  pruneConsumedPrivateRecords: 'pruneConsumedPrivateRecords',
  readIncomingDeliveries: 'readIncomingDeliveries',
  upsertIncomingDeliveries: 'upsertIncomingDeliveries',
  readDeliverySyncState: 'readDeliverySyncState',
  setDeliverySyncState: 'setDeliverySyncState',
  readTransactionStatus: 'readTransactionStatus',
  setTransactionStatus: 'setTransactionStatus',
  clearTransactionStatus: 'clearTransactionStatus',
  saveWalletPrivateAddressScalar: 'saveWalletPrivateAddressScalar',
  readWalletPrivateAddressScalar: 'readWalletPrivateAddressScalar',
  saveWalletPrivateAddressRecord: 'saveWalletPrivateAddressRecord',
  readWalletPrivateAddressRecord: 'readWalletPrivateAddressRecord',
  setWalletDefaultPrivateAddressNonce: 'setWalletDefaultPrivateAddressNonce',
  readWalletDefaultPrivateAddressNonce: 'readWalletDefaultPrivateAddressNonce',
  deleteWalletPrivateAddressScalar: 'deleteWalletPrivateAddressScalar',
} as const;

export type StellarStateDefinition = StateBridgeDefinition;

export interface StellarPublicBalanceInput {
  owner: StellarAddress;
  asset: StellarAssetId;
  balance: string;
  trustlineStatus: 'active' | 'inactive' | 'none';
}
