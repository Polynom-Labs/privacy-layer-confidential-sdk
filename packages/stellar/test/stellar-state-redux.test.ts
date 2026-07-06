import {
  bindReduxStateAdapter,
  createReduxStateAdapter,
} from '@arcane/privacy-sdk-state-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { stellarStateDefinitions } from '../src/state/definitions/index.js';
import { createTestClient } from './stellar-client.test-helpers.js';

describe('Stellar state with Redux adapter', () => {
  it('persists registry lookup through redux store writes', async () => {
    const bundle = createReduxStateAdapter({ reducerPath: 'privacySdkState' });
    bundle.bridge.init(stellarStateDefinitions);
    const store = configureStore({
      reducer: {
        [bundle.reducerPath]: bundle.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        [...getDefaultMiddleware(), bundle.middleware] as ReturnType<
          typeof getDefaultMiddleware
        >,
    });
    bindReduxStateAdapter(bundle, store);

    const { client } = await createTestClient({ state: bundle.adapter });
    await client.saveRegistryLookup({
      owner: 'G-WALLET',
      status: 'registered',
      privateAddressStpl1: 'stpl1wallet',
      cachedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(await client.getRegistryLookup('G-WALLET')).toMatchObject({
      privateAddressStpl1: 'stpl1wallet',
    });

    const branch = store.getState()[bundle.reducerPath] as Record<string, unknown>;
    const registry = branch.registry as Record<string, unknown>;
    const lookups = registry.lookups as Record<string, unknown>;
    expect(lookups['G-WALLET']).toMatchObject({
      privateAddressStpl1: 'stpl1wallet',
    });
  });

  it('reads pending claims from redux branch without mutating store', async () => {
    const bundle = createReduxStateAdapter();
    bundle.bridge.init(stellarStateDefinitions);
    const store = configureStore({
      reducer: {
        [bundle.reducerPath]: bundle.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        [...getDefaultMiddleware(), bundle.middleware] as ReturnType<
          typeof getDefaultMiddleware
        >,
    });
    bindReduxStateAdapter(bundle, store);

    const { client } = await createTestClient({ state: bundle.adapter });
    await client.replacePendingClaimsPage({
      owner: 'G-OWNER',
      claims: [
        {
          id: 'redux-claim',
          owner: 'G-OWNER',
          asset: 'USDC',
          amount: 5n,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      paginationInfo: {
        total: 1,
        page: 1,
        pageSize: 20,
        hasMore: false,
      },
    });

    const claims = await client.getPendingClaims({ owner: 'G-OWNER' });
    expect(claims.items).toHaveLength(1);
    const branch = store.getState()[bundle.reducerPath] as Record<string, unknown>;
    expect(branch.pendingClaims).toBeDefined();
  });
});
