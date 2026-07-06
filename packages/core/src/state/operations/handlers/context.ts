export interface OperationContext {
  stateTree: Record<string, unknown>;
  createMissing: boolean;
}

export type OperationHandler = (
  operation: import('../schemas.js').StateOperation,
  context: OperationContext,
) => unknown;
