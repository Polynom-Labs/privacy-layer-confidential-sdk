import type { StateBridge, StateBridgeAdapter } from './types.js';
import {
  registerStateBridgeDefinitions,
  resolveStateBridgeCall,
} from './validation.js';
import type { StateBridgeDefinition } from './types.js';

export { StateBridgeValidationError } from './validation.js';

export function createStateBridge(adapter: StateBridgeAdapter): StateBridge {
  const definitions = new Map<string, StateBridgeDefinition>();

  return {
    init(definitionsList) {
      registerStateBridgeDefinitions(definitions, definitionsList, adapter);
    },
    register(definitionsList) {
      registerStateBridgeDefinitions(definitions, definitionsList, adapter);
    },
    async write(call) {
      const validated = resolveStateBridgeCall(definitions, call, 'write');
      await adapter.write(validated);
    },
    async read(call) {
      const validated = resolveStateBridgeCall(definitions, call, 'read');
      return adapter.read(validated);
    },
  };
}
