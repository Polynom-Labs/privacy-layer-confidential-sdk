import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';
import type { OperationKind } from '@arcanetech/privacy-sdk-core';
import type { StellarPreparedOperation } from '../src/types.js';
import {
  ESCROW_SUBMISSION_REFUSAL,
  EscrowSubmissionRefusedError,
  SUBMISSION_METHOD,
  requiredSubmissionMethod,
} from '../src/transact/index.js';

const FIELD_BYTES = 32;
const SUPPORTED_SIGNAL_COUNT = 95;
const PUBLIC_DEPOSIT_INDEX = 93;
const PROOF_BYTES = 'aabbccddeeff';
const APPLICATION_ID_HINTS: string[] = ['101', '101', '0', '0'];

const PUBLIC_DISCLOSURE = {
  senderAddress: 'public' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'public' as const,
  amount: 'public' as const,
};

function fieldFromUnsigned(value: bigint): Buffer {
  return Buffer.from(value.toString(16).padStart(FIELD_BYTES * 2, '0'), 'hex');
}

function packSignals(publicDepositAmount: bigint): string {
  const fields = Array.from({ length: SUPPORTED_SIGNAL_COUNT }, (_unused, index) =>
    fieldFromUnsigned(index === PUBLIC_DEPOSIT_INDEX ? publicDepositAmount : 0n),
  );
  return Buffer.concat(fields).toString('hex');
}

function preparedOperation(input: {
  kind: OperationKind;
  publicDepositAmount: bigint;
  spendSource?: NonNullable<
    StellarPreparedOperation['transactArtifacts']
  >['spendSource'];
  escrowSend?: boolean;
  omitPublicHex?: boolean;
}): StellarPreparedOperation {
  const transactArtifacts: NonNullable<StellarPreparedOperation['transactArtifacts']> =
    {
      proofHex: PROOF_BYTES,
      applicationIdsPlaintext: APPLICATION_ID_HINTS,
      ...(input.omitPublicHex
        ? {}
        : { publicHex: packSignals(input.publicDepositAmount) }),
      ...(input.spendSource ? { spendSource: input.spendSource } : {}),
      ...(input.escrowSend ? { escrowSend: true } : {}),
    };
  return {
    kind: input.kind,
    intent: {
      from: 'G-SIGNER',
      to: 'recipient',
      asset: 'USDC',
      amount: 1n,
      disclosure: PUBLIC_DISCLOSURE,
    },
    consumedRecords: [],
    outputRecords: [],
    submissionPayload: { operationId: 'op-1', signed: false },
    transactArtifacts,
  };
}

describe('requiredSubmissionMethod', () => {
  it.each([
    {
      name: 'positive public deposit',
      kind: 'deposit' as const,
      publicDepositAmount: 10_000_000n,
      expected: SUBMISSION_METHOD.direct,
    },
    {
      name: 'zero-amount deposit',
      kind: 'deposit' as const,
      publicDepositAmount: 0n,
      expected: SUBMISSION_METHOD.relay,
    },
    {
      name: 'transfer',
      kind: 'transfer' as const,
      spendSource: 'privateAddress' as const,
      publicDepositAmount: 0n,
      expected: SUBMISSION_METHOD.relay,
    },
    {
      name: 'withdraw',
      kind: 'withdraw' as const,
      publicDepositAmount: 0n,
      expected: SUBMISSION_METHOD.relay,
    },
    {
      name: 'transfer with positive public deposit',
      kind: 'transfer' as const,
      spendSource: 'privateAddress' as const,
      publicDepositAmount: 10_000_000n,
      expected: SUBMISSION_METHOD.direct,
    },
    {
      name: 'withdraw with positive public deposit',
      kind: 'withdraw' as const,
      publicDepositAmount: 10_000_000n,
      expected: SUBMISSION_METHOD.direct,
    },
    {
      name: 'escrow send',
      kind: 'transfer' as const,
      spendSource: 'escrow' as const,
      escrowSend: true,
      publicDepositAmount: 0n,
      expected: SUBMISSION_METHOD.relay,
    },
    {
      name: 'escrow send flagged without public signals',
      kind: 'transfer' as const,
      spendSource: 'escrow' as const,
      escrowSend: true,
      publicDepositAmount: 0n,
      omitPublicHex: true,
      expected: SUBMISSION_METHOD.relay,
    },
    {
      name: 'escrow sweep',
      kind: 'transfer' as const,
      spendSource: 'escrow' as const,
      publicDepositAmount: 0n,
      expected: SUBMISSION_METHOD.direct,
    },
  ])(
    'returns $expected for $name',
    ({
      kind,
      spendSource,
      escrowSend,
      publicDepositAmount,
      expected,
      omitPublicHex,
    }) => {
      expect(
        requiredSubmissionMethod(
          preparedOperation({
            kind,
            publicDepositAmount,
            ...(spendSource ? { spendSource } : {}),
            ...(escrowSend ? { escrowSend: true } : {}),
            ...(omitPublicHex ? { omitPublicHex: true } : {}),
          }),
        ),
      ).toBe(expected);
    },
  );

  it('refuses an escrow send with any positive public deposit instead of downgrading', () => {
    expect(() =>
      requiredSubmissionMethod(
        preparedOperation({
          kind: 'transfer',
          spendSource: 'escrow',
          publicDepositAmount: 1n,
        }),
      ),
    ).toThrow(EscrowSubmissionRefusedError);
    try {
      requiredSubmissionMethod(
        preparedOperation({
          kind: 'transfer',
          spendSource: 'escrow',
          publicDepositAmount: 1n,
        }),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(EscrowSubmissionRefusedError);
      expect((error as EscrowSubmissionRefusedError).reason).toBe(
        ESCROW_SUBMISSION_REFUSAL.positivePublicDeposit,
      );
    }
  });

  it('refuses a prepared operation that is missing packed public signals', () => {
    const prepared = preparedOperation({
      kind: 'withdraw',
      publicDepositAmount: 0n,
    });
    const artifacts = { ...prepared.transactArtifacts };
    delete artifacts.publicHex;

    expect(() =>
      requiredSubmissionMethod({
        ...prepared,
        transactArtifacts: artifacts,
      }),
    ).toThrow(/missing transact artifacts/i);
  });
});
