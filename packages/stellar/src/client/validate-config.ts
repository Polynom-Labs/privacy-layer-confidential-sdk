import {
  missingDependencyError,
  type PrivacySdkError,
} from '@arcanetech/privacy-sdk-core';
import type { StellarPrivacyClientConfigBase } from '../types.js';

export function validateStellarConfig(
  config: Partial<StellarPrivacyClientConfigBase & { assets?: unknown }>,
): PrivacySdkError[] {
  const errors: PrivacySdkError[] = [];

  if (config.network === undefined) {
    errors.push(
      missingDependencyError('network', 'Network configuration is required.'),
    );
  }
  if (config.wallet === undefined) {
    errors.push(missingDependencyError('wallet', 'Wallet adapter is required.'));
  }
  if (config.state === undefined) {
    errors.push(missingDependencyError('state', 'State adapter is required.'));
  }
  if (config.assets === undefined) {
    errors.push(missingDependencyError('crypto', 'ZK assets are required.'));
  }

  return errors;
}
