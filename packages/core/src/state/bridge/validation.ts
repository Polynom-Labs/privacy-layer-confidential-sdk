import { executionError } from '../../errors.js';
import type { StateBridgeCall } from '../operations/schemas.js';
import type { StateBridgeAdapter, StateBridgeDefinition } from './types.js';

export class StateBridgeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateBridgeValidationError';
  }
}

export function registerStateBridgeDefinitions(
  definitions: Map<string, StateBridgeDefinition>,
  items: StateBridgeDefinition[],
  adapter: StateBridgeAdapter,
): void {
  for (const definition of items) {
    if (definitions.has(definition.type)) {
      throw new StateBridgeValidationError(
        `State bridge type already registered: ${definition.type}`,
      );
    }
    definitions.set(definition.type, definition);
    adapter.registerDefinition(definition);
  }
}

export function resolveStateBridgeCall(
  definitions: Map<string, StateBridgeDefinition>,
  call: unknown,
  expectedMode: 'read' | 'write',
): StateBridgeCall {
  if (typeof call !== 'object' || call === null || !('type' in call)) {
    throw new StateBridgeValidationError('State bridge call must include a type.');
  }

  const typeValue = (call as { type: unknown }).type;
  if (typeof typeValue !== 'string' || typeValue.length === 0) {
    throw new StateBridgeValidationError('State bridge call type must be a string.');
  }

  const definition = definitions.get(typeValue);
  if (definition === undefined) {
    throw executionError(`Unknown state bridge type: ${typeValue}`, 'stateRead');
  }

  if (definition.mode !== expectedMode) {
    throw new StateBridgeValidationError(
      `State bridge type ${typeValue} is registered for ${definition.mode}, not ${expectedMode}.`,
    );
  }

  const parsed = definition.schema.safeParse(call);
  if (!parsed.success) {
    throw new StateBridgeValidationError(parsed.error.message);
  }

  return parsed.data;
}
