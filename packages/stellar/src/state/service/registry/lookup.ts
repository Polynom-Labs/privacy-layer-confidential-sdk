import type { StellarStateServiceBase } from '../base.js';
import { createRegistryLookupReadMethods } from './lookup-read.js';
import { createRegistryLookupWriteMethods } from './lookup-write.js';

export function createRegistryLookupService(context: StellarStateServiceBase) {
  return {
    ...createRegistryLookupReadMethods(context),
    ...createRegistryLookupWriteMethods(context),
  };
}
