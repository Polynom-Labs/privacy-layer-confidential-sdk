import type { StellarBrowserAssets } from '../../types.js';
import { PrivacyPoolService } from '../pool/service.js';

export function createPrivacyPoolService(input?: {
  assets?: StellarBrowserAssets;
  applicationId?: string;
  auditPublicKey?: [string, string];
}): PrivacyPoolService {
  return new PrivacyPoolService(
    input?.assets,
    input?.applicationId,
    input?.auditPublicKey,
  );
}

let configuredPrivacyPoolService: PrivacyPoolService | undefined;

export function configurePrivacyPoolService(service: PrivacyPoolService): void {
  configuredPrivacyPoolService = service;
}

export function getPrivacyPoolService(): PrivacyPoolService {
  if (!configuredPrivacyPoolService) {
    throw new Error(
      'PrivacyPoolService is not configured. Call configurePrivacyPoolService first.',
    );
  }
  return configuredPrivacyPoolService;
}
