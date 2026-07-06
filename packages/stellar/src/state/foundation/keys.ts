import type { StellarAddress, StellarAssetId } from '../../types.js';

export function ownerAssetKey(owner: StellarAddress, asset: StellarAssetId): string {
  return `${owner}:${asset}`;
}

export function readRecordValue<T>(
  record: Record<string, T>,
  key: string,
): T | undefined {
  if (!Object.hasOwn(record, key)) {
    return undefined;
  }
  return Reflect.get(record, key) as T | undefined;
}

export function poolLeafKey(poolContract: string, leafIndex: number): string {
  return `${poolContract}:${leafIndex}`;
}

export function privateAddressAssetKey(
  privateAddress: string,
  asset: StellarAssetId,
): string {
  return `${privateAddress}:${asset}`;
}

export function walletOwnerNonceKey(owner: StellarAddress, nonce: string): string {
  return `${owner}:${nonce}`;
}
