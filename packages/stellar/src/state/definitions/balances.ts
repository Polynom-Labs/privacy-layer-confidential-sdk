import type { StateBridgeDefinition } from '@arcane/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  readPublicBalanceSchema,
  readPublicBalancesSchema,
  setPublicBalanceSchema,
  setPublicBalancesSchema,
} from '../schemas/assets/balances.js';

export const stellarBalancesStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.readPublicBalance,
    mode: 'read',
    schema: readPublicBalanceSchema,
  },
  {
    type: stellarStateCallTypes.readPublicBalances,
    mode: 'read',
    schema: readPublicBalancesSchema,
  },
  {
    type: stellarStateCallTypes.setPublicBalance,
    mode: 'write',
    schema: setPublicBalanceSchema,
  },
  {
    type: stellarStateCallTypes.setPublicBalances,
    mode: 'write',
    schema: setPublicBalancesSchema,
  },
];
