import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import {
  readWalletPrivateAddressScalarSchema,
  saveWalletPrivateAddressScalarSchema,
} from '../schemas/wallet/scalar.js';
import {
  deleteWalletPrivateAddressScalarSchema,
  readWalletDefaultPrivateAddressNonceSchema,
  readWalletPrivateAddressRecordSchema,
  saveWalletPrivateAddressRecordSchema,
  setWalletDefaultPrivateAddressNonceSchema,
} from '../schemas/wallet/private-address.js';
import { stellarStateCallTypes } from '../bridge/call-types.js';

export const stellarWalletStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.saveWalletPrivateAddressScalar,
    mode: 'write',
    schema: saveWalletPrivateAddressScalarSchema,
  },
  {
    type: stellarStateCallTypes.readWalletPrivateAddressScalar,
    mode: 'read',
    schema: readWalletPrivateAddressScalarSchema,
  },
  {
    type: stellarStateCallTypes.saveWalletPrivateAddressRecord,
    mode: 'write',
    schema: saveWalletPrivateAddressRecordSchema,
  },
  {
    type: stellarStateCallTypes.readWalletPrivateAddressRecord,
    mode: 'read',
    schema: readWalletPrivateAddressRecordSchema,
  },
  {
    type: stellarStateCallTypes.setWalletDefaultPrivateAddressNonce,
    mode: 'write',
    schema: setWalletDefaultPrivateAddressNonceSchema,
  },
  {
    type: stellarStateCallTypes.readWalletDefaultPrivateAddressNonce,
    mode: 'read',
    schema: readWalletDefaultPrivateAddressNonceSchema,
  },
  {
    type: stellarStateCallTypes.deleteWalletPrivateAddressScalar,
    mode: 'write',
    schema: deleteWalletPrivateAddressScalarSchema,
  },
];
