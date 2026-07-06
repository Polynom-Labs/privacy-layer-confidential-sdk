import type { OnboardingPayload } from '../../onboarding/payload.js';
import type { InspectKytPassageApproved } from '@auditable/privacy-pool-zk-sdk';
import { resolvePoolApplicationId } from '../../audit/parameters.js';
import type { KytApplicationIdHints } from '../../pool/proof-types.js';
import { KytInspectError, parseKytReasonCode } from '../inspect-error.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import { fetchCurrentLedger } from './poll.js';
import { registerKytPassage } from './submit.js';

type KytInspectResponse =
  | InspectKytPassageApproved
  | {
      status: 'rejected' | 'needs_review';
      reasonCode?: string;
      decisionId?: string;
    };

export interface DecryptedKytAuditSlot {
  slot: number;
  decryptOk: boolean;
  auditTagValid: boolean;
  noteAuditPublicKey?: [string, string];
  expectedAuditPublicKey?: [string, string];
  plaintext?: string[];
}

export interface RequestKytPassageForPoolInteractionInput {
  owner: string;
  poolContract: string;
  proofHex: string;
  publicHex: string;
  onboarding?: OnboardingPayload;
  decryptedAuditSlots?: DecryptedKytAuditSlot[];
  applicationIdsPlaintext?: KytApplicationIdHints;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  transactEnvironment: StellarTransactEnvironment;
}

function buildApplicationIdHints(
  applicationId: string,
): [string, string, string, string] {
  return [applicationId, applicationId, applicationId, applicationId];
}

function buildNonce(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
}

function kytJsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

async function parseInspectResponse(response: Response): Promise<KytInspectResponse> {
  const body = (await response.json()) as KytInspectResponse;
  if (!response.ok) {
    throw new Error(`KYT inspect failed: ${JSON.stringify(body)}`);
  }
  return body;
}

function throwKytInspectRejected(
  body: Exclude<KytInspectResponse, InspectKytPassageApproved>,
): never {
  const reasonCode = body.reasonCode ?? body.status;
  const parsed = parseKytReasonCode(reasonCode);
  throw new KytInspectError({
    message: reasonCode,
    reasonCode,
    ...(body.decisionId ? { decisionId: body.decisionId } : {}),
    ...(parsed.address ? { detailAddress: parsed.address } : {}),
  });
}

export async function requestKytPassageForPoolInteraction(
  input: RequestKytPassageForPoolInteractionInput,
): Promise<InspectKytPassageApproved> {
  const applicationId = resolvePoolApplicationId(
    input.transactEnvironment.network.applicationId,
  );
  const applicationIdsPlaintext =
    input.applicationIdsPlaintext ?? buildApplicationIdHints(applicationId);
  const kytRegistry = input.transactEnvironment.kyt.kytPassageRegistryContract;
  const currentLedger = await fetchCurrentLedger(input.sorobanRpcUrl);
  const response = await fetch(
    `${input.transactEnvironment.kyt.apiBaseUrl}/kyt/passages/inspect`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(
        {
          owner: input.owner,
          poolContract: input.poolContract,
          kytRegistry,
          proofBytes: input.proofHex,
          publicSignalsBytes: input.publicHex,
          applicationIdsPlaintext,
          decryptedAuditSlots: input.decryptedAuditSlots,
          onboarding: input.onboarding,
          nonce: buildNonce(),
          currentLedger,
        },
        kytJsonReplacer,
      ),
    },
  );
  const body = await parseInspectResponse(response);
  if (body.status !== 'approved') {
    throwKytInspectRejected(body);
  }
  if (input.transactEnvironment.kyt.registerPassageOnChain) {
    await registerKytPassage({
      approval: body,
      owner: input.owner,
      networkPassphrase: input.networkPassphrase,
      sorobanRpcUrl: input.sorobanRpcUrl,
      transactEnvironment: input.transactEnvironment,
    });
  }
  return body;
}
