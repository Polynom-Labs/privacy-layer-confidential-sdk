import { z } from 'zod';
import { STELLAR_STATE_PATHS } from '../../foundation/paths.js';
import { stellarStateCallTypes } from '../../bridge/call-types.js';
import { registryLookupSchema } from '../shared.js';

export const readStellarAddressRegisteredSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readStellarAddressRegistered),
    address: z.string().min(1),
  })
  .transform(({ type, address }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.registryRegisteredAddresses,
        key: address,
      },
    ],
  }));

export const readCachedPrivateAddressSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readCachedPrivateAddress),
    address: z.string().min(1),
  })
  .transform(({ type, address }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.registryPrivateAddresses,
        key: address,
      },
    ],
  }));

export const saveRegisteredPrivateAddressSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.saveRegisteredPrivateAddress),
    address: z.string().min(1),
    privateAddress: z.string().min(1),
    registered: z.boolean(),
  })
  .transform(({ type, address, privateAddress, registered }) => {
    const lookup = registryLookupSchema.parse({
      owner: address,
      status: registered ? 'registered' : 'unregistered',
      privateAddressStpl1: registered ? privateAddress : undefined,
      cachedAt: new Date().toISOString(),
    });
    return {
      type,
      operations: [
        {
          opType: 'recordSet' as const,
          jsonPath: STELLAR_STATE_PATHS.registryPrivateAddresses,
          key: address,
          value: privateAddress,
        },
        {
          opType: 'recordSet' as const,
          jsonPath: STELLAR_STATE_PATHS.registryRegisteredAddresses,
          key: address,
          value: registered,
        },
        {
          opType: 'recordSet' as const,
          jsonPath: STELLAR_STATE_PATHS.registryLookups,
          key: address,
          value: lookup,
        },
      ],
    };
  });

export const invalidateRegisteredAddressSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.invalidateRegisteredAddress),
    address: z.string().min(1),
  })
  .transform(({ type, address }) => ({
    type,
    operations: [
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.registryPrivateAddresses,
        key: address,
      },
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.registryRegisteredAddresses,
        key: address,
      },
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.registryLookups,
        key: address,
      },
    ],
  }));

export const readRegistryLookupSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.readRegistryLookup),
    address: z.string().min(1),
  })
  .transform(({ type, address }) => ({
    type,
    operations: [
      {
        opType: 'recordGet' as const,
        jsonPath: STELLAR_STATE_PATHS.registryLookups,
        key: address,
      },
    ],
  }));

export const saveRegistryLookupSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.saveRegistryLookup),
    lookup: registryLookupSchema,
  })
  .transform(({ type, lookup }) => {
    const operations: Array<{
      opType: 'recordSet';
      jsonPath: string;
      key: string;
      value: unknown;
    }> = [
      {
        opType: 'recordSet',
        jsonPath: STELLAR_STATE_PATHS.registryLookups,
        key: lookup.owner,
        value: lookup,
      },
    ];
    if (lookup.status === 'registered' && lookup.privateAddressStpl1) {
      operations.push(
        {
          opType: 'recordSet',
          jsonPath: STELLAR_STATE_PATHS.registryPrivateAddresses,
          key: lookup.owner,
          value: lookup.privateAddressStpl1,
        },
        {
          opType: 'recordSet',
          jsonPath: STELLAR_STATE_PATHS.registryRegisteredAddresses,
          key: lookup.owner,
          value: true,
        },
      );
    } else {
      operations.push({
        opType: 'recordSet',
        jsonPath: STELLAR_STATE_PATHS.registryRegisteredAddresses,
        key: lookup.owner,
        value: false,
      });
    }
    return { type, operations };
  });

export const invalidateRegistryLookupSchema = z
  .object({
    type: z.literal(stellarStateCallTypes.invalidateRegistryLookup),
    address: z.string().min(1),
  })
  .transform(({ type, address }) => ({
    type,
    operations: [
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.registryLookups,
        key: address,
      },
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.registryPrivateAddresses,
        key: address,
      },
      {
        opType: 'recordDelete' as const,
        jsonPath: STELLAR_STATE_PATHS.registryRegisteredAddresses,
        key: address,
      },
    ],
  }));
