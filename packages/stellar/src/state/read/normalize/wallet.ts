import {
  walletPrivateAddressScalarSchema,
  walletPrivateAddressRecordSchema,
} from '../../schemas/shared.js';
import type {
  StellarWalletPrivateAddressScalar,
  StellarWalletPrivateAddressRecord,
} from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizeWalletPrivateAddressScalar(
  value: unknown,
): StellarWalletPrivateAddressScalar | undefined {
  const parsed = walletPrivateAddressScalarSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarWalletPrivateAddressScalar)
    : undefined;
}

export function normalizeWalletPrivateAddressRecord(
  value: unknown,
): StellarWalletPrivateAddressRecord | undefined {
  const parsed = walletPrivateAddressRecordSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarWalletPrivateAddressRecord)
    : undefined;
}

export function normalizeWalletDefaultPrivateAddressNonce(
  value: unknown,
): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}
