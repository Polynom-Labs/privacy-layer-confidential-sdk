import type { StateBridgeDefinition } from '@arcane/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  invalidateRegisteredAddressSchema,
  invalidateRegistryLookupSchema,
  readCachedPrivateAddressSchema,
  readRegistryLookupSchema,
  readStellarAddressRegisteredSchema,
  saveRegisteredPrivateAddressSchema,
  saveRegistryLookupSchema,
} from '../schemas/registry/lookup.js';

export const stellarRegistryStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.readStellarAddressRegistered,
    mode: 'read',
    schema: readStellarAddressRegisteredSchema,
  },
  {
    type: stellarStateCallTypes.readCachedPrivateAddress,
    mode: 'read',
    schema: readCachedPrivateAddressSchema,
  },
  {
    type: stellarStateCallTypes.readRegistryLookup,
    mode: 'read',
    schema: readRegistryLookupSchema,
  },
  {
    type: stellarStateCallTypes.saveRegisteredPrivateAddress,
    mode: 'write',
    schema: saveRegisteredPrivateAddressSchema,
  },
  {
    type: stellarStateCallTypes.saveRegistryLookup,
    mode: 'write',
    schema: saveRegistryLookupSchema,
  },
  {
    type: stellarStateCallTypes.invalidateRegisteredAddress,
    mode: 'write',
    schema: invalidateRegisteredAddressSchema,
  },
  {
    type: stellarStateCallTypes.invalidateRegistryLookup,
    mode: 'write',
    schema: invalidateRegistryLookupSchema,
  },
];
