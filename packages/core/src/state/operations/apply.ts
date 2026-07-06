import type { StateOperation, StateBridgeMode } from './schemas.js';
import { StateJsonPathError } from '../json-path/tree.js';
import { operationHandlers } from './handlers.js';

const readOperationTypes = new Set<StateOperation['opType']>([
  'recordGet',
  'recordKeys',
  'recordValues',
  'recordEntries',
  'primitiveGet',
]);

export class StateOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateOperationError';
  }
}

export function applyStateOperations(
  stateTree: Record<string, unknown>,
  operations: StateOperation[],
  mode: StateBridgeMode,
): unknown {
  let readResult: unknown;
  const createMissing = mode === 'write';

  for (const operation of operations) {
    readResult = applyStateOperation(stateTree, operation, mode, createMissing);
  }

  if (mode === 'read') {
    const lastOperation = operations.at(-1);
    if (lastOperation === undefined || !readOperationTypes.has(lastOperation.opType)) {
      throw new StateOperationError('Read calls must end with a read operation.');
    }
    return readResult;
  }

  return undefined;
}

function applyStateOperation(
  stateTree: Record<string, unknown>,
  operation: StateOperation,
  mode: StateBridgeMode,
  createMissing: boolean,
): unknown {
  if (mode === 'read' && !readOperationTypes.has(operation.opType)) {
    throw new StateOperationError(
      `Operation ${operation.opType} is not allowed in read mode.`,
    );
  }

  try {
    return operationHandlers[operation.opType](operation, { stateTree, createMissing });
  } catch (error) {
    if (error instanceof StateJsonPathError) {
      throw new StateOperationError(error.message);
    }
    throw error;
  }
}
