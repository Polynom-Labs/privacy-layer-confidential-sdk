import { RELAY_TRANSACT_PACKAGE_VERSION_V1 } from './constants.js';
import { assertSupportedPublicSignals } from './signals.js';
import type {
  PrepareRelayTransactPackageInput,
  RelayTransactPackageV1,
} from './types.js';

function normalizeHex(value: string): string {
  return value.replace(/^0x/iu, '').toLowerCase();
}

export function prepareRelayTransactPackage(
  input: PrepareRelayTransactPackageInput,
): RelayTransactPackageV1 {
  const zkConfigNonce = input.zkConfigNonce ?? 0n;
  assertSupportedPublicSignals(input.publicSignals, zkConfigNonce);
  const prepared: RelayTransactPackageV1 = {
    version: RELAY_TRANSACT_PACKAGE_VERSION_V1,
    poolSelector: input.poolSelector,
    zkConfigNonce,
    proofBytes: normalizeHex(input.proofBytes),
    publicSignals: normalizeHex(input.publicSignals),
    applicationIdHints: input.applicationIdHints,
  };
  if (input.escrowRecipient) {
    prepared.escrowRecipient = input.escrowRecipient;
  }
  if (input.escrowAuthorization) {
    prepared.escrowAuthorization = input.escrowAuthorization;
  }
  if (input.keyVersionHints) {
    prepared.keyVersionHints = input.keyVersionHints;
  }
  return prepared;
}
