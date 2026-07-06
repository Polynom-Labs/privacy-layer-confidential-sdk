import { z } from 'zod';
import { walletOwnerNonceKey } from '../../foundation/keys.js';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { walletPrivateAddressScalarSchema } from '../shared.js';

export const saveWalletPrivateAddressScalarSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.saveWalletPrivateAddressScalar),
    scalar: walletPrivateAddressScalarSchema,
  })
  .transform(({ type, scalar }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.walletPrivateAddressScalars,
        key: walletOwnerNonceKey(scalar.owner, scalar.nonce),
        value: scalar,
      },
    ],
  }));

export const readWalletPrivateAddressScalarSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readWalletPrivateAddressScalar),
    owner: z.string().min(1),
    nonce: z.string().min(1),
  })
  .transform(({ type, owner, nonce }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.walletPrivateAddressScalars,
        key: walletOwnerNonceKey(owner, nonce),
      },
    ],
  }));
