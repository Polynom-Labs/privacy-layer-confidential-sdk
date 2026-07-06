import type { StellarStateServiceBase } from '../base.js';
import { createClaimsReadMethods } from './read-methods.js';
import { createClaimsWriteMethods } from './write-methods.js';

export function createClaimsService(context: StellarStateServiceBase) {
  return {
    ...createClaimsWriteMethods(context),
    ...createClaimsReadMethods(context),
  };
}
