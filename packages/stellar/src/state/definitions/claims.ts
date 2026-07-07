import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  clearPendingClaimsSchema,
  pendingClaimsWriteSchema,
  readPendingClaimsSchema,
} from '../schemas/claims/write.js';
import {
  readPendingClaimsCountSchema,
  removePendingClaimsSchema,
  replacePendingClaimsPageSchema,
  setPendingClaimsCountSchema,
  upsertPendingClaimsSchema,
} from '../schemas/claims/page.js';

export const stellarClaimsStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.pendingClaims,
    mode: 'write',
    schema: pendingClaimsWriteSchema,
  },
  {
    type: stellarStateCallTypes.clearPendingClaims,
    mode: 'write',
    schema: clearPendingClaimsSchema,
  },
  {
    type: stellarStateCallTypes.readPendingClaims,
    mode: 'read',
    schema: readPendingClaimsSchema,
  },
  {
    type: stellarStateCallTypes.replacePendingClaimsPage,
    mode: 'write',
    schema: replacePendingClaimsPageSchema,
  },
  {
    type: stellarStateCallTypes.upsertPendingClaims,
    mode: 'write',
    schema: upsertPendingClaimsSchema,
  },
  {
    type: stellarStateCallTypes.removePendingClaims,
    mode: 'write',
    schema: removePendingClaimsSchema,
  },
  {
    type: stellarStateCallTypes.readPendingClaimsCount,
    mode: 'read',
    schema: readPendingClaimsCountSchema,
  },
  {
    type: stellarStateCallTypes.setPendingClaimsCount,
    mode: 'write',
    schema: setPendingClaimsCountSchema,
  },
];
