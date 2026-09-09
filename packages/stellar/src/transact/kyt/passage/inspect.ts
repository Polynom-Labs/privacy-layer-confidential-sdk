import {
  layoutForKnownNonce,
  zeroBindingTagsInPublicSignals,
  type InspectKytPassageApproved,
} from '@auditable/privacy-pool-zk-sdk';
import { resolvePoolApplicationId } from '../../audit/parameters.js';
import type { KytApplicationIdHints } from '../../pool/proof-types.js';
import { KytInspectError, parseKytReasonCode } from '../inspect-error.js';
import type { StellarTransactEnvironment } from '../../environment/types.js';
import { fetchCurrentLedger } from './poll.js';
import { registerKytPassage } from './submit.js';
import { resolveZkConfigNonce } from '../../environment/zk-config-nonce.js';
import { uniformApplicationIdHints } from '../../zk/slots.js';

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
  ciphertextHex?: string;
  outputNoteEphemeralScalars?: string[];
  decryptedAuditSlots?: DecryptedKytAuditSlot[];
  applicationIdsPlaintext?: KytApplicationIdHints;
  networkPassphrase: string;
  sorobanRpcUrl: string;
  transactEnvironment: StellarTransactEnvironment;
}

function buildApplicationIdHints(
  applicationId: string,
  nAuditSlots: number,
): KytApplicationIdHints {
  return uniformApplicationIdHints(applicationId, nAuditSlots);
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

function inspectRequestHeaders(inspectAuthorization?: string): Record<string, string> {
  const token = inspectAuthorization?.trim();
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function postKytInspect(
  input: RequestKytPassageForPoolInteractionInput,
  applicationIdsPlaintext: KytApplicationIdHints,
  zkConfigNonce: bigint,
  currentLedger: number,
): Promise<KytInspectResponse> {
  const response = await fetch(
    `${input.transactEnvironment.kyt.apiBaseUrl}/kyt/passages/inspect`,
    {
      method: 'POST',
      headers: inspectRequestHeaders(
        input.transactEnvironment.kyt.inspectAuthorization,
      ),
      body: JSON.stringify(
        {
          owner: input.owner,
          poolContract: input.poolContract,
          kytRegistry: input.transactEnvironment.kyt.kytPassageRegistryContract,
          proofBytes: input.proofHex,
          publicSignalsBytes: zeroBindingTagsInPublicSignals(
            input.publicHex,
            zkConfigNonce,
          ).toString('hex'),
          applicationIdsPlaintext,
          decryptedAuditSlots: input.decryptedAuditSlots,
          nonce: buildNonce(),
          zkConfigNonce,
          currentLedger,
          ...(input.ciphertextHex ? { ciphertextBytes: input.ciphertextHex } : {}),
          ...(input.outputNoteEphemeralScalars
            ? { outputNoteEphemeralScalars: input.outputNoteEphemeralScalars }
            : {}),
        },
        kytJsonReplacer,
      ),
    },
  );
  return parseInspectResponse(response);
}

export async function requestKytPassageForPoolInteraction(
  input: RequestKytPassageForPoolInteractionInput,
): Promise<InspectKytPassageApproved> {
  const applicationId = resolvePoolApplicationId(
    input.transactEnvironment.network.applicationId,
  );
  const zkConfigNonce = resolveZkConfigNonce(input.transactEnvironment);
  const applicationIdsPlaintext =
    input.applicationIdsPlaintext ??
    buildApplicationIdHints(
      applicationId,
      layoutForKnownNonce(zkConfigNonce).nAuditSlots,
    );
  const currentLedger = await fetchCurrentLedger(input.sorobanRpcUrl);
  const body = await postKytInspect(
    input,
    applicationIdsPlaintext,
    zkConfigNonce,
    currentLedger,
  );
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
