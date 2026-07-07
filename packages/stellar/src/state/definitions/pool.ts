import type { StateBridgeDefinition } from '@arcanetech/privacy-sdk-core/state';
import { stellarStateCallTypes } from '../bridge/call-types.js';
import {
  readLeafEphemeralSchema,
  readPoolMerkleStateSchema,
  setLeafEphemeralSchema,
  setPoolMerkleStateSchema,
} from '../schemas/pool/merkle.js';

export const stellarPoolStateDefinitions: StateBridgeDefinition[] = [
  {
    type: stellarStateCallTypes.readPoolMerkleState,
    mode: 'read',
    schema: readPoolMerkleStateSchema,
  },
  {
    type: stellarStateCallTypes.setPoolMerkleState,
    mode: 'write',
    schema: setPoolMerkleStateSchema,
  },
  {
    type: stellarStateCallTypes.readLeafEphemeral,
    mode: 'read',
    schema: readLeafEphemeralSchema,
  },
  {
    type: stellarStateCallTypes.setLeafEphemeral,
    mode: 'write',
    schema: setLeafEphemeralSchema,
  },
];
