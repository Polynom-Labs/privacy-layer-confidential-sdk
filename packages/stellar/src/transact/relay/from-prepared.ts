import type { StellarPreparedOperation } from '../../types.js';
import { prepareRelayTransactPackage } from './prepare.js';
import type {
  PrepareRelayTransactPackageInput,
  RelayKeyVersionHints,
  RelayTransactPackageV1,
} from './types.js';

export type PrepareRelayTransactPackageFromPreparedInput = {
  prepared: StellarPreparedOperation;
  poolSelector: string;
  zkConfigNonce?: bigint;
  keyVersionHints?: RelayKeyVersionHints;
};

function requirePreparedArtifacts(
  prepared: StellarPreparedOperation,
): Pick<
  PrepareRelayTransactPackageInput,
  'proofBytes' | 'publicSignals' | 'applicationIdHints' | 'escrowRecipient'
> {
  const artifacts = prepared.transactArtifacts;
  if (
    !artifacts?.proofHex ||
    !artifacts.publicHex ||
    !artifacts.applicationIdsPlaintext
  ) {
    throw new Error('Prepared operation is missing transact artifacts.');
  }
  return {
    proofBytes: artifacts.proofHex,
    publicSignals: artifacts.publicHex,
    applicationIdHints: artifacts.applicationIdsPlaintext,
    ...(artifacts.escrowRecipient
      ? { escrowRecipient: artifacts.escrowRecipient }
      : {}),
  };
}

export function prepareRelayTransactPackageFromPrepared(
  input: PrepareRelayTransactPackageFromPreparedInput,
): RelayTransactPackageV1 {
  return prepareRelayTransactPackage({
    poolSelector: input.poolSelector,
    ...requirePreparedArtifacts(input.prepared),
    ...(input.zkConfigNonce === undefined
      ? {}
      : { zkConfigNonce: input.zkConfigNonce }),
    ...(input.keyVersionHints ? { keyVersionHints: input.keyVersionHints } : {}),
  });
}
