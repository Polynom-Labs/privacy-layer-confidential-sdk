import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestClient } from './stellar-client.test-helpers.js';
import type { PendingClaimsBackendListResponse } from '../src/pending-claims-backend.js';

const BACKEND_BASE_URL = 'https://backend.test/api';

const pendingClaimsBackendResponse: PendingClaimsBackendListResponse = {
  data: [
    {
      id: 101,
      ownerAddress: 'G-OWNER',
      poolTxId: 'tx-101',
      commitmentHex: '0xabc',
      nullifierHex: '0xdef',
      futureNullifierHashHex: '0x111',
      noteValue: '25',
      assetHiHex: '0x1',
      assetLoHex: '0x2',
      nullifierFieldHex: '0x333',
      secretHex: '0x444',
      tempPublicKeyXHex: '0x555',
      tempPublicKeyYHex: '0x666',
      encryptedRecoveryBase64: 'encrypted',
      createdAtLedger: 100,
      createdAt: '2026-06-01T12:00:00.000Z',
    },
    {
      id: 102,
      ownerAddress: 'G-OWNER',
      poolTxId: 'tx-102',
      commitmentHex: '0xabc2',
      nullifierHex: '0xdef2',
      futureNullifierHashHex: '0x112',
      noteValue: '50',
      assetHiHex: '0x1',
      assetLoHex: '0x2',
      nullifierFieldHex: '0x334',
      secretHex: '0x445',
      tempPublicKeyXHex: '0x556',
      tempPublicKeyYHex: '0x667',
      encryptedRecoveryBase64: 'encrypted2',
      createdAtLedger: 101,
      createdAt: '2026-06-02T12:00:00.000Z',
    },
  ],
  meta: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
};

describe('pending claims REST integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads pending claims from backend REST into in-memory state via Stellar client API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (!url.includes('/pending-claims?')) {
          return new Response(undefined, { status: 404 });
        }
        return Response.json(pendingClaimsBackendResponse);
      }),
    );

    const { client } = await createTestClient();

    await client.loadPendingClaimsFromBackend({
      backendBaseUrl: BACKEND_BASE_URL,
      ownerAddress: 'G-OWNER',
      asset: 'USDC',
      page: 1,
      pageSize: 20,
    });

    const pendingClaims = await client.getPendingClaims();

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND_BASE_URL}/pending-claims?ownerAddress=G-OWNER&page=1&limit=20`,
    );
    expect(pendingClaims.items).toHaveLength(2);
    expect(pendingClaims.items[0]).toMatchObject({
      id: '101',
      amount: 25n,
    });
    expect(pendingClaims.items[1]).toMatchObject({
      id: '102',
      amount: 50n,
    });
    expect(pendingClaims.pagination).toEqual({
      total: 2,
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
  });
});
