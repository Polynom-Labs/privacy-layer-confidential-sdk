import type { StateOperation } from '../schemas.js';
import { ensureRecordAtPath } from '../../json-path/tree.js';
import type { OperationContext } from './context.js';

function applyRecordGet(
  operation: Extract<StateOperation, { opType: 'recordGet' }>,
  context: OperationContext,
): unknown {
  const record = ensureRecordAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  return record[operation.key];
}

function applyRecordSet(
  operation: Extract<StateOperation, { opType: 'recordSet' }>,
  context: OperationContext,
): void {
  const record = ensureRecordAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  record[operation.key] = operation.value;
}

function applyRecordDelete(
  operation: Extract<StateOperation, { opType: 'recordDelete' }>,
  context: OperationContext,
): void {
  const record = ensureRecordAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  delete record[operation.key];
}

function applyRecordKeys(
  operation: Extract<StateOperation, { opType: 'recordKeys' }>,
  context: OperationContext,
): string[] {
  const record = ensureRecordAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  return Object.keys(record);
}

function applyRecordValues(
  operation: Extract<StateOperation, { opType: 'recordValues' }>,
  context: OperationContext,
): unknown[] {
  const record = ensureRecordAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  return Object.values(record);
}

function applyRecordEntries(
  operation: Extract<StateOperation, { opType: 'recordEntries' }>,
  context: OperationContext,
): Array<[string, unknown]> {
  const record = ensureRecordAtPath(
    context.stateTree,
    operation.jsonPath,
    context.createMissing,
  );
  return Object.entries(record);
}

export const recordOperationHandlers = {
  recordGet: (operation: StateOperation, context: OperationContext) => {
    return applyRecordGet(
      operation as Extract<StateOperation, { opType: 'recordGet' }>,
      context,
    );
  },
  recordSet: (operation: StateOperation, context: OperationContext) => {
    applyRecordSet(
      operation as Extract<StateOperation, { opType: 'recordSet' }>,
      context,
    );
  },
  recordDelete: (operation: StateOperation, context: OperationContext) => {
    applyRecordDelete(
      operation as Extract<StateOperation, { opType: 'recordDelete' }>,
      context,
    );
  },
  recordKeys: (operation: StateOperation, context: OperationContext) => {
    return applyRecordKeys(
      operation as Extract<StateOperation, { opType: 'recordKeys' }>,
      context,
    );
  },
  recordValues: (operation: StateOperation, context: OperationContext) => {
    return applyRecordValues(
      operation as Extract<StateOperation, { opType: 'recordValues' }>,
      context,
    );
  },
  recordEntries: (operation: StateOperation, context: OperationContext) => {
    return applyRecordEntries(
      operation as Extract<StateOperation, { opType: 'recordEntries' }>,
      context,
    );
  },
};
