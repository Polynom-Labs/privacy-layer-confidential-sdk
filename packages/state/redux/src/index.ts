import {
  applyStateOperations,
  cloneStateTree,
  createStateBridge,
  normalizeSerializableStateValues,
  type StateBridge,
  type StateBridgeAdapter,
  type StateBridgeCall,
  type StateBridgeDefinition,
} from '@arcanetech/privacy-sdk-core/state';
import type { Middleware } from '@reduxjs/toolkit';

export const STATE_BRIDGE_APPLY_WRITE =
  '@arcanetech/privacy-sdk-state-redux/applyWrite';
export const STATE_BRIDGE_HYDRATE = '@arcanetech/privacy-sdk-state-redux/hydrate';

export interface StateBridgeApplyWriteAction {
  [key: string]: unknown;
  type: typeof STATE_BRIDGE_APPLY_WRITE;
  payload: {
    call: StateBridgeCall;
  };
}

export interface StateBridgeHydrateAction {
  [key: string]: unknown;
  type: typeof STATE_BRIDGE_HYDRATE;
  payload: Record<string, unknown>;
}

export type PrivacySdkStateReducerAction =
  StateBridgeApplyWriteAction | StateBridgeHydrateAction | { type: string };

export interface ReduxStateAdapterOptions {
  reducerPath?: string;
}

export interface ReduxStateAdapter extends StateBridgeAdapter {
  reducerPath: string;
  reducer: (
    state: Record<string, unknown> | undefined,
    action: PrivacySdkStateReducerAction,
  ) => Record<string, unknown>;
  middleware: Middleware;
  bindStore(input: {
    getState: () => Record<string, unknown>;
    dispatch: (action: StateBridgeApplyWriteAction) => void;
  }): void;
}

export interface ReduxStateAdapterBundle {
  adapter: ReduxStateAdapter;
  bridge: StateBridge;
  reducerPath: string;
  reducer: ReduxStateAdapter['reducer'];
  middleware: Middleware;
}

function stateBranchReducer(
  state: Record<string, unknown> | undefined,
  action: PrivacySdkStateReducerAction,
): Record<string, unknown> {
  if (action.type === STATE_BRIDGE_HYDRATE) {
    const hydrateAction = action as StateBridgeHydrateAction;
    return cloneStateTree(
      normalizeSerializableStateValues(hydrateAction.payload) as Record<
        string,
        unknown
      >,
    );
  }

  if (action.type !== STATE_BRIDGE_APPLY_WRITE) {
    return state ?? {};
  }

  const writeAction = action as StateBridgeApplyWriteAction;
  const draft = cloneStateTree(state ?? {});
  applyStateOperations(draft, writeAction.payload.call.operations, 'write');
  return draft;
}

function passthroughNext(next: (action: unknown) => unknown) {
  return (action: unknown) => next(action);
}

function passthroughMiddleware(_api: unknown) {
  return passthroughNext;
}

class ReduxStateAdapterImpl implements ReduxStateAdapter {
  readonly reducerPath: string;
  readonly reducer = stateBranchReducer;
  readonly middleware: Middleware = passthroughMiddleware as Middleware;
  private readonly registeredTypes = new Set<string>();
  private readState: () => Record<string, unknown> = () => ({});
  private writeDispatch: (action: StateBridgeApplyWriteAction) => void = () => {
    throw new Error('Redux state adapter store is not bound.');
  };

  constructor(reducerPath: string) {
    this.reducerPath = reducerPath;
  }

  registerDefinition(definition: StateBridgeDefinition): void {
    this.registeredTypes.add(definition.type);
  }

  bindStore(input: {
    getState: () => Record<string, unknown>;
    dispatch: (action: StateBridgeApplyWriteAction) => void;
  }): void {
    this.readState = input.getState;
    this.writeDispatch = input.dispatch;
  }

  async write(call: StateBridgeCall): Promise<void> {
    if (!this.registeredTypes.has(call.type)) {
      throw new Error(`Unregistered redux state type: ${call.type}`);
    }
    this.writeDispatch({
      type: STATE_BRIDGE_APPLY_WRITE,
      payload: {
        call: normalizeSerializableStateValues(call) as StateBridgeCall,
      },
    });
  }

  async read<TResult>(call: StateBridgeCall): Promise<TResult> {
    if (!this.registeredTypes.has(call.type)) {
      throw new Error(`Unregistered redux state type: ${call.type}`);
    }
    const draft = cloneStateTree(this.readState());
    return applyStateOperations(draft, call.operations, 'read') as TResult;
  }
}

export function createReduxStateAdapter(
  options: ReduxStateAdapterOptions = {},
): ReduxStateAdapterBundle {
  const reducerPath = options.reducerPath ?? 'privacySdkState';
  const adapter = new ReduxStateAdapterImpl(reducerPath);
  const bridge = createStateBridge(adapter);

  return {
    adapter,
    bridge,
    reducerPath,
    reducer: adapter.reducer,
    middleware: adapter.middleware,
  };
}

function readReducerBranch(
  rootState: Record<string, unknown>,
  reducerPath: string,
): Record<string, unknown> {
  const branch = Reflect.get(rootState, reducerPath);
  if (typeof branch !== 'object' || branch === null || Array.isArray(branch)) {
    return {};
  }
  return branch as Record<string, unknown>;
}

export function hydrateReduxPrivacySdkState(
  branch: Record<string, unknown>,
): StateBridgeHydrateAction {
  return {
    type: STATE_BRIDGE_HYDRATE,
    payload: branch,
  };
}

export function bindReduxStateAdapter(
  bundle: ReduxStateAdapterBundle,
  store: {
    getState: () => Record<string, unknown>;
    dispatch: (action: StateBridgeApplyWriteAction) => void;
  },
  reducerPath = bundle.reducerPath,
): void {
  bundle.adapter.bindStore({
    getState: () => readReducerBranch(store.getState(), reducerPath),
    dispatch: store.dispatch,
  });
}
