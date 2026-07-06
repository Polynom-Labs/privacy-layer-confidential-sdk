import { leafEphemeralSchema, poolMerkleStateSchema } from '../../schemas/shared.js';
import type {
  StellarLeafEphemeral,
  StellarPoolMerkleState,
} from '../../domain/types.js';
import { withoutUndefinedFields } from '../../foundation/coerce.js';

export function normalizePoolMerkleState(
  value: unknown,
): StellarPoolMerkleState | undefined {
  const parsed = poolMerkleStateSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarPoolMerkleState)
    : undefined;
}

export function normalizeLeafEphemeral(
  value: unknown,
): StellarLeafEphemeral | undefined {
  const parsed = leafEphemeralSchema.safeParse(value);
  return parsed.success
    ? (withoutUndefinedFields(parsed.data) as StellarLeafEphemeral)
    : undefined;
}
