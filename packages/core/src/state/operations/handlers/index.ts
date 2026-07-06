import type { StateOperation } from '../schemas.js';
import { arrayOperationHandlers } from './array.js';
import type { OperationHandler } from './context.js';
import { primitiveOperationHandlers } from './primitive.js';
import { recordOperationHandlers } from './record.js';

export type { OperationHandler } from './context.js';

export const operationHandlers: Record<StateOperation['opType'], OperationHandler> = {
  ...arrayOperationHandlers,
  ...recordOperationHandlers,
  ...primitiveOperationHandlers,
};
