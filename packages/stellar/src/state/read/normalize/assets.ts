import { assetSchema, publicBalanceSchema } from '../../schemas/shared.js';
import type {
  StellarAsset,
  StellarAssetsCatalog,
  StellarPublicBalance,
} from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizeAssetsCatalog(value: unknown): StellarAssetsCatalog {
  if (typeof value !== 'object' || value === null) {
    return { byId: {}, listOrder: [] };
  }
  const record = value as Record<string, unknown>;
  const byIdRaw = record.byId;
  const listOrderRaw = record.listOrder;
  const byId: Record<string, StellarAsset> = {};
  if (typeof byIdRaw === 'object' && byIdRaw !== null) {
    for (const [key, entry] of Object.entries(byIdRaw)) {
      const parsed = assetSchema.safeParse(entry);
      if (parsed.success) {
        byId[key] = withoutUndefinedFields(parsed.data) as StellarAsset;
      }
    }
  }
  const listOrder = Array.isArray(listOrderRaw)
    ? listOrderRaw.filter((item): item is string => typeof item === 'string')
    : [];
  return { byId, listOrder };
}

export function normalizeAsset(value: unknown): StellarAsset | undefined {
  const parsed = assetSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarAsset)
    : undefined;
}

export function normalizePublicBalance(
  value: unknown,
): StellarPublicBalance | undefined {
  const parsed = publicBalanceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function normalizePublicBalancesFromEntries(
  value: unknown,
  owner: string,
): StellarPublicBalance[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) {
        return;
      }
      const [key, balanceValue] = entry;
      if (typeof key !== 'string' || !key.startsWith(`${owner}:`)) {
        return;
      }
      return normalizePublicBalance(balanceValue);
    })
    .filter((balance): balance is StellarPublicBalance => balance !== undefined);
}
