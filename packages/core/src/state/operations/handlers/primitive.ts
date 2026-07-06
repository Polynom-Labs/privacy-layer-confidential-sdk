import type { StateOperation } from '../schemas.js';
import { getJsonPathValue, setJsonPathValue } from '../../json-path/tree.js';
import type { OperationContext } from './context.js';

function toNumberValue(current: unknown): number {
  if (typeof current === 'number') {
    return current;
  }
  if (typeof current === 'bigint') {
    return Number(current);
  }
  return 0;
}

function applyPrimitiveIncrement(
  operation: Extract<StateOperation, { opType: 'primitiveIncrement' }>,
  context: OperationContext,
): number {
  const current = getJsonPathValue(context.stateTree, operation.jsonPath);
  const delta = operation.delta ?? 1;
  const next = toNumberValue(current) + delta;
  setJsonPathValue(context.stateTree, operation.jsonPath, next, context.createMissing);
  return next;
}

export const primitiveOperationHandlers = {
  primitiveGet: (operation: StateOperation, context: OperationContext) => {
    return getJsonPathValue(context.stateTree, operation.jsonPath);
  },
  primitiveSet: (operation: StateOperation, context: OperationContext) => {
    setJsonPathValue(
      context.stateTree,
      operation.jsonPath,
      (operation as Extract<StateOperation, { opType: 'primitiveSet' }>).value,
      context.createMissing,
    );
  },
  primitiveIncrement: (operation: StateOperation, context: OperationContext) => {
    return applyPrimitiveIncrement(
      operation as Extract<StateOperation, { opType: 'primitiveIncrement' }>,
      context,
    );
  },
  primitiveNull: (operation: StateOperation, context: OperationContext) => {
    setJsonPathValue(
      context.stateTree,
      operation.jsonPath,
      undefined,
      context.createMissing,
    );
  },
};
