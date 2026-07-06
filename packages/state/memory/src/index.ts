import {
  applyStateOperations,
  cloneStateTree,
  createStateBridge,
  type StateBridge,
  type StateBridgeAdapter,
  type StateBridgeCall,
  type StateBridgeDefinition,
} from '@arcane/privacy-sdk-core/state';

export interface InMemoryStateAdapter extends StateBridgeAdapter {
  getState(): Record<string, unknown>;
  resetState(nextState?: Record<string, unknown>): void;
}

export function createInMemoryStateAdapter(
  initialState: Record<string, unknown> = {},
): InMemoryStateAdapter {
  let stateTree = cloneStateTree(initialState);
  const registeredTypes = new Set<string>();

  const adapter: InMemoryStateAdapter = {
    registerDefinition(definition: StateBridgeDefinition) {
      registeredTypes.add(definition.type);
    },
    async write(call: StateBridgeCall) {
      if (!registeredTypes.has(call.type)) {
        throw new Error(`Unregistered in-memory state type: ${call.type}`);
      }
      const draft = cloneStateTree(stateTree);
      applyStateOperations(draft, call.operations, 'write');
      stateTree = draft;
    },
    async read<TResult>(call: StateBridgeCall): Promise<TResult> {
      if (!registeredTypes.has(call.type)) {
        throw new Error(`Unregistered in-memory state type: ${call.type}`);
      }
      const draft = cloneStateTree(stateTree);
      return applyStateOperations(draft, call.operations, 'read') as TResult;
    },
    getState() {
      return cloneStateTree(stateTree);
    },
    resetState(nextState: Record<string, unknown> = {}) {
      stateTree = cloneStateTree(nextState);
    },
  };

  return adapter;
}

export function createInMemoryStateBridge(initialState?: Record<string, unknown>): {
  adapter: InMemoryStateAdapter;
  bridge: StateBridge;
} {
  const adapter = createInMemoryStateAdapter(initialState);
  const bridge = createStateBridge(adapter);
  return { adapter, bridge };
}
