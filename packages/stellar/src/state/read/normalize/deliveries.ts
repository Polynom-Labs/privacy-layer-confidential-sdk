import {
  deliverySyncStateSchema,
  incomingDeliverySchema,
} from '../../schemas/shared.js';
import type {
  StellarDeliverySyncState,
  StellarIncomingDelivery,
} from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizeIncomingDeliveries(value: unknown): StellarIncomingDelivery[] {
  const entries =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.values(value)
      : value;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.flatMap((entry) => {
    const parsed = incomingDeliverySchema.safeParse(entry);
    return parsed.success
      ? [withoutUndefinedFields(parsed.data) as StellarIncomingDelivery]
      : [];
  });
}

export function normalizeDeliverySyncState(
  value: unknown,
): StellarDeliverySyncState | undefined {
  const parsed = deliverySyncStateSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarDeliverySyncState)
    : undefined;
}
