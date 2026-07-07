import {
  createInMemoryStateAdapter,
  type InMemoryStateAdapter,
} from '@arcanetech/privacy-sdk-state-memory';
import type {
  StateBridgeAdapter,
  StateBridgeCall,
} from '@arcanetech/privacy-sdk-core/state';
import {
  createStellarPrivacyClientFromResolvedConfig,
  resolveStellarPrivacyClientConfig,
} from '../src/client/resolve-config.js';
import { createFakeTransactEngine } from '../src/testing/index.js';
import type {
  StellarPolicyAdapter,
  StellarPrivateRecord,
  StellarWalletAdapter,
} from '../src/types.js';

export async function createTestClient(
  overrides: {
    state?: StateBridgeAdapter;
    policy?: StellarPolicyAdapter;
    engine?: ReturnType<typeof createFakeTransactEngine>;
    records?: StellarPrivateRecord[];
  } = {},
) {
  const stateAdapter =
    overrides.state ??
    createInMemoryStateAdapter({
      privateRecords: overrides.records ?? [],
    });
  const wallet: StellarWalletAdapter = {
    getAddress: async () => 'G-SENDER',
    authorizeMessage: async () => new Uint8Array([1]),
    signTransactionPayload: async (payload) => ({ ...payload, signed: true }),
  };

  const resolved = await resolveStellarPrivacyClientConfig(
    {
      network: {
        id: 'testnet',
        rpcUrl: 'https://example.invalid',
        networkPassphrase: 'Test',
        poolContract: 'C-POOL',
        registryContract: 'C-REGISTRY',
        applicationId: '101',
      },
      wallet,
      state: stateAdapter,
      assets: {
        sdkWasm: new ArrayBuffer(8),
        circuitWasm: new ArrayBuffer(8),
        provingKey: new ArrayBuffer(8),
      },
      transactEngine: overrides.engine ?? createFakeTransactEngine(),
      ...(overrides.policy ? { policy: overrides.policy } : {}),
    },
    async () => overrides.engine ?? createFakeTransactEngine(),
  );

  if (!resolved.ok) {
    throw new Error('Expected valid test client config');
  }

  const client = createStellarPrivacyClientFromResolvedConfig(resolved.config);
  return { client, stateAdapter };
}

export function createRecord(
  owner: string,
  asset: string,
  amount: bigint,
  id: string = crypto.randomUUID(),
): StellarPrivateRecord {
  return {
    id,
    owner,
    asset,
    amount,
    consumed: false,
  };
}

export function createFailingStateAdapter(
  base: InMemoryStateAdapter,
  options: { failOnType: string },
): InMemoryStateAdapter {
  return {
    ...base,
    async write(call: StateBridgeCall) {
      if (call.type === options.failOnType) {
        throw new Error('storage failed');
      }
      return base.write(call);
    },
  };
}

function isInMemoryStateAdapter(
  adapter: StateBridgeAdapter,
): adapter is InMemoryStateAdapter {
  return 'getState' in adapter && typeof adapter.getState === 'function';
}

export function getInMemoryStateFromAdapter(
  adapter: StateBridgeAdapter,
): Record<string, unknown> | undefined {
  return isInMemoryStateAdapter(adapter) ? adapter.getState() : undefined;
}
