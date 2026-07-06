import { z } from 'zod';
import { walletOwnerNonceKey } from '../../foundation/keys.js';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { walletPrivateAddressRecordSchema } from '../shared.js';

export const saveWalletPrivateAddressRecordSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.saveWalletPrivateAddressRecord),
    record: walletPrivateAddressRecordSchema,
  })
  .transform(({ type, record }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.walletPrivateAddressRecords,
        key: walletOwnerNonceKey(record.owner, record.nonce),
        value: record,
      },
    ],
  }));

export const readWalletPrivateAddressRecordSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readWalletPrivateAddressRecord),
    owner: z.string().min(1),
    nonce: z.string().min(1),
  })
  .transform(({ type, owner, nonce }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.walletPrivateAddressRecords,
        key: walletOwnerNonceKey(owner, nonce),
      },
    ],
  }));

export const setWalletDefaultPrivateAddressNonceSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.setWalletDefaultPrivateAddressNonce),
    owner: z.string().min(1),
    nonce: z.string().min(1),
  })
  .transform(({ type, owner, nonce }) => ({
    type,
    operations: [
      {
        opType: 'recordSet' as const,
        jsonPath: STELLAR_STATE_PATHS.walletDefaultPrivateAddressNonce,
        key: owner,
        value: nonce,
      },
    ],
  }));

export const readWalletDefaultPrivateAddressNonceSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readWalletDefaultPrivateAddressNonce),
    owner: z.string().min(1),
  })
  .transform(({ type, owner }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.walletDefaultPrivateAddressNonce,
        key: owner,
      },
    ],
  }));

export const deleteWalletPrivateAddressScalarSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.deleteWalletPrivateAddressScalar),
    owner: z.string().min(1),
    nonce: z.string().min(1),
  })
  .transform(({ type, owner, nonce }) => ({
    type,
    operations: [
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.walletPrivateAddressScalars,
        key: walletOwnerNonceKey(owner, nonce),
      },
    ],
  }));
