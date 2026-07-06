import { paginationSchema, pendingClaimSchema } from '../../schemas/shared.js';
import type {
  StellarPendingClaim,
  StellarPendingClaimsState,
} from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizePendingClaimsState(value: unknown): StellarPendingClaimsState {
  if (typeof value !== 'object' || value === null) {
    return { items: [] };
  }

  const record = value as Record<string, unknown>;
  const items = Array.isArray(record.items)
    ? record.items.flatMap((item) => {
        const parsed = pendingClaimSchema.safeParse(item);
        return parsed.success
          ? [withoutUndefinedFields(parsed.data) as StellarPendingClaim]
          : [];
      })
    : [];

  const paginationResult = paginationSchema.safeParse(record.pagination);
  if (paginationResult.success) {
    return { items, pagination: paginationResult.data };
  }
  return { items };
}

export function normalizePendingClaimsCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}
