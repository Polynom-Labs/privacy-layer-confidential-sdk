import type { z } from 'zod';
import type {
  StateBridgeCall,
  StateBridgeMode,
  StateOperation,
} from '../operations/schemas.js';

export interface StateBridgeDefinition<TInput = unknown> {
  type: string;
  mode: StateBridgeMode;
  schema: z.ZodType<StateBridgeCall, z.ZodTypeDef, TInput>;
}

export interface StateBridgeAdapter {
  registerDefinition(definition: StateBridgeDefinition): void;
  write(call: StateBridgeCall): Promise<void>;
  read<TResult>(call: StateBridgeCall): Promise<TResult>;
}

export interface StateBridge {
  init(definitions: StateBridgeDefinition[]): void;
  register(definitions: StateBridgeDefinition[]): void;
  write(call: unknown): Promise<void>;
  read<TResult>(call: unknown): Promise<TResult>;
}

export interface ResolvedStateBridgeCall {
  type: string;
  operations: StateOperation[];
}
