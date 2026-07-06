import type { StellarAddress, StellarAssetId } from '../../types.js';
import type {
  StellarPendingClaim,
  StellarPendingClaimsPagination,
} from '../domain/types.js';

export interface PendingClaimsBackendListItem {
  id: number;
  ownerAddress: string;
  poolTxId: string;
  commitmentHex: string;
  nullifierHex: string;
  futureNullifierHashHex: string;
  noteValue: string;
  assetHiHex: string;
  assetLoHex: string;
  nullifierFieldHex: string;
  secretHex: string;
  tempPublicKeyXHex: string;
  tempPublicKeyYHex: string;
  encryptedRecoveryBase64: string;
  createdAtLedger: number;
  createdAt: string;
}

export interface PendingClaimsBackendListResponse {
  data: PendingClaimsBackendListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PendingClaimsBackendCountResponse {
  count: number;
}

export interface LoadPendingClaimsFromBackendInput {
  backendBaseUrl: string;
  ownerAddress: StellarAddress;
  asset?: StellarAssetId;
  page?: number;
  pageSize?: number;
}

export interface LoadPendingClaimsCountFromBackendInput {
  backendBaseUrl: string;
  ownerAddress: StellarAddress;
}

const DEFAULT_PENDING_CLAIMS_PAGE_SIZE = 20;

export async function fetchPendingClaimsBackendPage(
  input: LoadPendingClaimsFromBackendInput,
): Promise<PendingClaimsBackendListResponse> {
  const page = input.page ?? 1;
  const limit = input.pageSize ?? DEFAULT_PENDING_CLAIMS_PAGE_SIZE;
  const params = new URLSearchParams({
    ownerAddress: input.ownerAddress,
    page: String(page),
    limit: String(limit),
  });
  const baseUrl = input.backendBaseUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/pending-claims?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Pending claims request failed: ${response.status}`);
  }
  return response.json() as Promise<PendingClaimsBackendListResponse>;
}

export async function fetchPendingClaimsBackendCount(
  input: LoadPendingClaimsCountFromBackendInput,
): Promise<number> {
  const params = new URLSearchParams({
    ownerAddress: input.ownerAddress,
  });
  const baseUrl = input.backendBaseUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/pending-claims/count?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Pending claims count request failed: ${response.status}`);
  }
  const payload = (await response.json()) as PendingClaimsBackendCountResponse;
  return payload.count;
}

function mapBackendPendingClaimItem(
  item: PendingClaimsBackendListItem,
  asset: StellarAssetId = '',
): StellarPendingClaim {
  return {
    id: String(item.id),
    owner: item.ownerAddress,
    asset,
    amount: BigInt(item.noteValue),
    createdAt: item.createdAt,
    poolTxId: item.poolTxId,
    commitmentHex: item.commitmentHex,
    nullifierHex: item.nullifierHex,
    futureNullifierHashHex: item.futureNullifierHashHex,
    assetHiHex: item.assetHiHex,
    assetLoHex: item.assetLoHex,
    nullifierFieldHex: item.nullifierFieldHex,
    secretHex: item.secretHex,
    tempPublicKeyXHex: item.tempPublicKeyXHex,
    tempPublicKeyYHex: item.tempPublicKeyYHex,
    encryptedRecoveryBase64: item.encryptedRecoveryBase64,
    createdAtLedger: item.createdAtLedger,
  };
}

export function mapBackendPendingClaimsPage(
  response: PendingClaimsBackendListResponse,
  asset: StellarAssetId = '',
): {
  claims: StellarPendingClaim[];
  paginationInfo: StellarPendingClaimsPagination;
} {
  return {
    claims: response.data.map((item) => mapBackendPendingClaimItem(item, asset)),
    paginationInfo: {
      total: response.meta.total,
      page: response.meta.page,
      pageSize: response.meta.limit,
      hasMore: response.meta.page < response.meta.totalPages,
    },
  };
}
