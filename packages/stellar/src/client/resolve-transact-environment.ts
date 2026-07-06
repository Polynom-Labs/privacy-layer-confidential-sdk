import { attachContractContext } from '../contracts/contract-context.js';
import { attachPoolStatePorts } from '../transact/merkle/attach-state-ports.js';
import { parseAuditPublicKeyFromEnvHex } from '../transact/audit/parameters.js';
import type { StellarTransactEnvironment } from '../transact/environment/types.js';
import type { StellarStateAdapter } from '../types.js';

export function resolveClientTransactEnvironment(input: {
  sourceTransactEnvironment?: StellarTransactEnvironment;
  auditPublicKeyHex?: string;
  state: StellarStateAdapter;
}): StellarTransactEnvironment | undefined {
  const transactEnvironmentWithStatePorts = input.sourceTransactEnvironment
    ? attachPoolStatePorts(input.sourceTransactEnvironment, input.state)
    : undefined;
  const transactEnvironmentWithAudit =
    transactEnvironmentWithStatePorts && input.auditPublicKeyHex
      ? {
          ...transactEnvironmentWithStatePorts,
          auditPublicKey: parseAuditPublicKeyFromEnvHex(input.auditPublicKeyHex),
        }
      : transactEnvironmentWithStatePorts;
  if (!transactEnvironmentWithAudit) {
    return undefined;
  }
  return attachContractContext(transactEnvironmentWithAudit);
}
