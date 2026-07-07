import {
  AdapterPrivacyClient,
  type TransferIntent,
} from '@arcanetech/privacy-sdk-core';
import {
  createStellarNetworkAdapter,
  createStellarPolicyAdapter,
} from '../adapters/index.js';
import {
  createStellarStateService,
  createStellarStorageAdapterFromState,
  type StellarStateService,
} from '../state/index.js';
import type {
  ResolvedStellarPrivacyClientConfig,
  StellarAddress,
  StellarAssetId,
  StellarOperationReceipt,
  StellarPreparedOperation,
  StellarPrivateRecord,
  StellarTransferIntent,
} from '../types.js';
import { createNullifierSpentChecker } from './nullifier-checker.js';
import { createNetworkFacet } from './network-facet.js';

function createOperationsFacet(
  config: ResolvedStellarPrivacyClientConfig,
  state: StellarStateService,
) {
  const storage = createStellarStorageAdapterFromState(state);
  const checkNullifierSpent = createNullifierSpentChecker(config.transactEnvironment);
  const client = new AdapterPrivacyClient<
    StellarAddress,
    StellarAssetId,
    bigint,
    StellarPreparedOperation['submissionPayload'],
    StellarPrivateRecord,
    StellarPreparedOperation,
    StellarOperationReceipt
  >({
    wallet: {
      getAddress: () => config.wallet.getAddress(),
      authorizeMessage: (message) => config.wallet.authorizeMessage(message),
      authorizePayload: (payload) => config.wallet.signTransactionPayload(payload),
    },
    storage,
    network: createStellarNetworkAdapter({
      storage,
      wallet: config.wallet,
      engine: config.transactEngine,
      poolContract: config.network.poolContract,
      getPendingClaims: () => state.getPendingClaims(),
      ...(checkNullifierSpent ? { checkNullifierSpent } : {}),
    }),
    policy: createStellarPolicyAdapter(config.policy),
  });

  return {
    deposit: client.deposit.bind(client),
    withdraw: client.withdraw.bind(client),
    transfer: (intent: StellarTransferIntent) =>
      client.transfer(
        intent as unknown as TransferIntent<StellarAddress, StellarAssetId, bigint>,
      ),
  };
}

export function composeStellarPrivacyClient(
  config: ResolvedStellarPrivacyClientConfig,
) {
  const state = createStellarStateService(config.state);
  const operations = createOperationsFacet(config, state);
  const network = createNetworkFacet({
    transactEnvironment: config.transactEnvironment,
    state,
  });

  return {
    state,
    operations,
    network,
    transactEnvironment: config.transactEnvironment,
  };
}

export type ComposedStellarPrivacyClient = ReturnType<
  typeof composeStellarPrivacyClient
>;
