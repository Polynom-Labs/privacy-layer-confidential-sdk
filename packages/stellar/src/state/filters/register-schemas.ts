import { registerArrayFilterItemSchema } from '@arcanetech/privacy-sdk-core/state';
import { pendingClaimSchema, privateRecordSchema } from '../schemas/shared.js';
import { stellarArrayFilterSchemaKeys } from './ops.js';

let registered = false;

export function registerStellarArrayFilterSchemas(): void {
  if (registered) {
    return;
  }
  registerArrayFilterItemSchema(
    stellarArrayFilterSchemaKeys.privateRecord,
    privateRecordSchema,
  );
  registerArrayFilterItemSchema(
    stellarArrayFilterSchemaKeys.pendingClaim,
    pendingClaimSchema,
  );
  registered = true;
}
