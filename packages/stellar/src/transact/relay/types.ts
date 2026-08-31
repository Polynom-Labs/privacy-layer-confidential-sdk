import type { OnboardingPayload } from '../onboarding/payload.js';
import type { KytApplicationIdHints } from '../pool/proof-types.js';
import { RELAY_TRANSACT_PACKAGE_VERSION_V1 } from './constants.js';

export type RelayTransactPackageVersion = typeof RELAY_TRANSACT_PACKAGE_VERSION_V1;

export type RelayKeyVersionHints = [
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
];

export type RelayTransactPackageV1 = {
  version: RelayTransactPackageVersion;
  poolSelector: string;
  zkConfigNonce: bigint;
  proofBytes: string;
  publicSignals: string;
  applicationIdHints: KytApplicationIdHints;
  onboarding?: OnboardingPayload;
  keyVersionHints?: RelayKeyVersionHints;
};

export type PrepareRelayTransactPackageInput = {
  poolSelector: string;
  proofBytes: string;
  publicSignals: string;
  applicationIdHints: KytApplicationIdHints;
  zkConfigNonce?: bigint;
  onboarding?: OnboardingPayload;
  keyVersionHints?: RelayKeyVersionHints;
};
