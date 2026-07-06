export type {
  ArrayCleanOperation,
  ArrayFilterOperation,
  ArrayPushOperation,
  PrimitiveGetOperation,
  PrimitiveIncrementOperation,
  PrimitiveNullOperation,
  PrimitiveSetOperation,
  RecordDeleteOperation,
  RecordEntriesOperation,
  RecordGetOperation,
  RecordKeysOperation,
  RecordSetOperation,
  RecordValuesOperation,
  StateBridgeCall,
  StateBridgeMode,
  StateOperation,
  StateOperationOpType,
} from './operations/schemas.js';
export {
  arrayCleanOperationSchema,
  arrayFilterOperationSchema,
  arrayPushOperationSchema,
  createStateBridgeCallSchema,
  primitiveGetOperationSchema,
  primitiveIncrementOperationSchema,
  primitiveNullOperationSchema,
  primitiveSetOperationSchema,
  recordDeleteOperationSchema,
  recordEntriesOperationSchema,
  recordGetOperationSchema,
  recordKeysOperationSchema,
  recordSetOperationSchema,
  recordValuesOperationSchema,
  stateBridgeCallSchema,
  stateOperationOpTypes,
  stateOperationSchema,
} from './operations/schemas.js';

export {
  arrayFilterRejectMatchSchema,
  filterArrayByRejectMatch,
  getArrayFilterItemSchema,
  registerArrayFilterItemSchema,
  shouldRejectArrayItem,
  type ArrayFilterRejectMatch,
} from './array-filter/match.js';
export { applyStateOperations, StateOperationError } from './operations/apply.js';
export { normalizeSerializableStateValues } from './serialization/normalize-values.js';
export {
  cloneStateTree,
  getJsonPathValue,
  resolveJsonPathParent,
  setJsonPathValue,
  StateJsonPathError,
} from './json-path/tree.js';

export type {
  ResolvedStateBridgeCall,
  StateBridge,
  StateBridgeAdapter,
  StateBridgeDefinition,
} from './bridge/types.js';
export { createStateBridge, StateBridgeValidationError } from './bridge/create.js';
