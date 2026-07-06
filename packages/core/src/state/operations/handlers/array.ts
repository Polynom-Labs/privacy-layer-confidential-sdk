import { filterArrayByRejectMatch } from '../../array-filter/match.js';
import type { StateOperation } from '../schemas.js';
import { ensureArrayAtPath, setJsonPathValue } from '../../json-path/tree.js';
import type { OperationContext } from './context.js';

function applyArrayPush(
  operation: Extract<StateOperation, { opType: 'arrayPush' }>,
  context: OperationContext,
): void {
  const array = ensureArrayAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  array.push(...operation.items);
}

function applyArrayFilter(
  operation: Extract<StateOperation, { opType: 'arrayFilter' }>,
  context: OperationContext,
): void {
  const array = ensureArrayAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  const filtered = filterArrayByRejectMatch(
    array,
    operation.itemSchemaKey,
    operation.rejectWhen,
  );
  setJsonPathValue(
    context.stateTree,
    operation.jsonPath,
    filtered,
    context.createMissing,
  );
}

function applyArrayClean(
  operation: Extract<StateOperation, { opType: 'arrayClean' }>,
  context: OperationContext,
): void {
  setJsonPathValue(context.stateTree, operation.jsonPath, [], context.createMissing);
}

export const arrayOperationHandlers = {
  arrayPush: (operation: StateOperation, context: OperationContext) => {
    applyArrayPush(
      operation as Extract<StateOperation, { opType: 'arrayPush' }>,
      context,
    );
  },
  arrayFilter: (operation: StateOperation, context: OperationContext) => {
    applyArrayFilter(
      operation as Extract<StateOperation, { opType: 'arrayFilter' }>,
      context,
    );
  },
  arrayClean: (operation: StateOperation, context: OperationContext) => {
    applyArrayClean(
      operation as Extract<StateOperation, { opType: 'arrayClean' }>,
      context,
    );
  },
};
