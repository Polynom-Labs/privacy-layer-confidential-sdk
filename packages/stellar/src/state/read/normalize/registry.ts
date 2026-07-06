import { registryLookupSchema } from '../../schemas/shared.js';
import type { StellarRegistryLookup } from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizeCachedPrivateAddress(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function normalizeRegistryLookup(
  value: unknown,
): StellarRegistryLookup | undefined {
  const parsed = registryLookupSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarRegistryLookup)
    : undefined;
}

export function normalizeRegistryLookupFromLegacy(input: {
  address: string;
  registered: unknown;
  privateAddress: unknown;
}): StellarRegistryLookup | undefined {
  const lookup = normalizeRegistryLookup(
    typeof input.registered === 'object' && input.registered !== null
      ? input.registered
      : undefined,
  );
  if (lookup) {
    return lookup;
  }
  if (input.registered === undefined && input.privateAddress === undefined) {
    return undefined;
  }
  const registered = Boolean(input.registered);
  const privateAddressStpl1 = normalizeCachedPrivateAddress(input.privateAddress);
  if (!registered && privateAddressStpl1 === undefined) {
    return { owner: input.address, status: 'unregistered' };
  }
  return withoutUndefinedFields({
    owner: input.address,
    status: registered ? 'registered' : 'unregistered',
    ...(privateAddressStpl1 === undefined ? {} : { privateAddressStpl1 }),
  }) as StellarRegistryLookup;
}
