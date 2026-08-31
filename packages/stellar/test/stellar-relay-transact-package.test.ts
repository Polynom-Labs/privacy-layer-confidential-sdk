import { Buffer } from 'buffer';
import { describe, expect, it } from 'vitest';
import {
  prepareRelayTransactPackage,
  prepareRelayTransactPackageFromPrepared,
  readRelayTransactSupportedProfile,
} from '../src/transact/index.js';

const FIELD_BYTES = 32;
const SUPPORTED_SIGNAL_COUNT = 79;
const NULLIFIER_0_INDEX = 0;
const NULLIFIER_1_INDEX = 1;
const STATE_ROOT_INDEX = 70;
const WITHDRAW_ADDRESS_HI_INDEX = 71;
const WITHDRAW_ADDRESS_LO_INDEX = 72;
const PUBLIC_WITHDRAWAL_ASSET_HI_INDEX = 73;
const PUBLIC_WITHDRAWAL_ASSET_LO_INDEX = 74;
const PUBLIC_DEPOSIT_ASSET_HI_INDEX = 75;
const PUBLIC_DEPOSIT_ASSET_LO_INDEX = 76;
const PUBLIC_DEPOSIT_INDEX = 77;
const PUBLIC_WITHDRAWAL_INDEX = 78;
const POOL_SELECTOR = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const PROOF_BYTES = 'aabbccddeeff';
const APPLICATION_ID_HINTS: [string, string, string, string] = ['101', '101', '0', '0'];

function fieldFromUnsigned(value: bigint): Buffer {
  return Buffer.from(value.toString(16).padStart(FIELD_BYTES * 2, '0'), 'hex');
}

function packSignals(
  entries: ReadonlyArray<readonly [number, bigint]>,
  signalCount: number = SUPPORTED_SIGNAL_COUNT,
): string {
  const overrides = new Map(entries);
  const fields = Array.from({ length: signalCount }, (_unused, index) =>
    fieldFromUnsigned(overrides.get(index) ?? 0n),
  );
  return Buffer.concat(fields).toString('hex');
}

const ONBOARDING = {
  owner: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  notes: { notes: [] },
  encrypted_private_key: Buffer.alloc(32),
  temp_public_key_x: Buffer.alloc(32, 1),
  temp_public_key_y: Buffer.alloc(32, 2),
  private_address_registration: { tag: 'None' as const, values: undefined },
};

describe('Relay Transact Package V1 preparation', () => {
  it('prepares a signer-independent v1 package from proof artifacts', () => {
    const publicSignals = packSignals([
      [NULLIFIER_0_INDEX, 11n],
      [NULLIFIER_1_INDEX, 22n],
      [PUBLIC_DEPOSIT_INDEX, 0n],
      [PUBLIC_WITHDRAWAL_INDEX, 5_000_000n],
    ]);

    const prepared = prepareRelayTransactPackage({
      poolSelector: POOL_SELECTOR,
      zkConfigNonce: 0n,
      proofBytes: PROOF_BYTES,
      publicSignals,
      applicationIdHints: APPLICATION_ID_HINTS,
      onboarding: ONBOARDING,
    });

    expect(prepared.version).toBe(1);
    expect(prepared.poolSelector).toBe(POOL_SELECTOR);
    expect(prepared.zkConfigNonce).toBe(0n);
    expect(prepared.proofBytes).toBe(PROOF_BYTES);
    expect(prepared.publicSignals).toBe(publicSignals);
    expect(prepared.applicationIdHints).toEqual(APPLICATION_ID_HINTS);
    expect(prepared.onboarding).toBe(ONBOARDING);
    expect(prepared).not.toHaveProperty('signer');
    expect(prepared).not.toHaveProperty('from');
    expect(prepared).not.toHaveProperty('verificationKey');
    expect(prepared).not.toHaveProperty('kytRegistry');
    expect(prepared).not.toHaveProperty('kytAuthorization');
    expect(prepared).not.toHaveProperty('network');
  });

  it('rejects the unsupported 65-signal layout', () => {
    const publicSignals = packSignals([[NULLIFIER_0_INDEX, 11n]], 65);

    expect(() =>
      prepareRelayTransactPackage({
        poolSelector: POOL_SELECTOR,
        proofBytes: PROOF_BYTES,
        publicSignals,
        applicationIdHints: APPLICATION_ID_HINTS,
      }),
    ).toThrow(/exactly 79 packed public signals/i);
  });

  it('preserves ordered nullifiers and public-leg context from packed signals', () => {
    const publicSignals = packSignals([
      [NULLIFIER_0_INDEX, 11n],
      [NULLIFIER_1_INDEX, 22n],
      [STATE_ROOT_INDEX, 99n],
      [WITHDRAW_ADDRESS_HI_INDEX, 7n],
      [WITHDRAW_ADDRESS_LO_INDEX, 8n],
      [PUBLIC_WITHDRAWAL_ASSET_HI_INDEX, 3n],
      [PUBLIC_WITHDRAWAL_ASSET_LO_INDEX, 4n],
      [PUBLIC_DEPOSIT_ASSET_HI_INDEX, 5n],
      [PUBLIC_DEPOSIT_ASSET_LO_INDEX, 6n],
      [PUBLIC_DEPOSIT_INDEX, 0n],
      [PUBLIC_WITHDRAWAL_INDEX, 5_000_000n],
    ]);
    const prepared = prepareRelayTransactPackage({
      poolSelector: POOL_SELECTOR,
      proofBytes: PROOF_BYTES,
      publicSignals,
      applicationIdHints: APPLICATION_ID_HINTS,
    });

    expect(readRelayTransactSupportedProfile(prepared)).toEqual({
      orderedNullifiers: [`${'0'.repeat(62)}0b`, `${'0'.repeat(62)}16`],
      publicLegContext: {
        stateRoot: `${'0'.repeat(62)}63`,
        withdrawAddressHi: `${'0'.repeat(62)}07`,
        withdrawAddressLo: `${'0'.repeat(62)}08`,
        publicWithdrawalAssetHi: `${'0'.repeat(62)}03`,
        publicWithdrawalAssetLo: `${'0'.repeat(62)}04`,
        publicDepositAssetHi: `${'0'.repeat(62)}05`,
        publicDepositAssetLo: `${'0'.repeat(62)}06`,
        publicDepositAmount: '0',
        publicWithdrawalAmount: '5000000',
      },
    });
  });

  it('includes optional key-version hints and omits them when absent', () => {
    const publicSignals = packSignals([[NULLIFIER_0_INDEX, 11n]]);
    const withHints = prepareRelayTransactPackage({
      poolSelector: POOL_SELECTOR,
      proofBytes: PROOF_BYTES,
      publicSignals,
      applicationIdHints: APPLICATION_ID_HINTS,
      keyVersionHints: [1, undefined, 2, undefined],
    });
    const withoutHints = prepareRelayTransactPackage({
      poolSelector: POOL_SELECTOR,
      proofBytes: PROOF_BYTES,
      publicSignals,
      applicationIdHints: APPLICATION_ID_HINTS,
    });

    expect(withHints.keyVersionHints).toEqual([1, undefined, 2, undefined]);
    expect(withoutHints).not.toHaveProperty('keyVersionHints');
    expect(withoutHints).not.toHaveProperty('onboarding');
  });

  it.each(['deposit', 'transfer', 'withdraw'] as const)(
    'prepares a %s operation without copying signer or KYT authorization',
    (kind) => {
      const publicSignals = packSignals([
        [NULLIFIER_0_INDEX, 11n],
        [PUBLIC_DEPOSIT_INDEX, kind === 'deposit' ? 10_000_000n : 0n],
      ]);
      const transactArtifacts = {
        proofHex: PROOF_BYTES,
        publicHex: publicSignals,
        applicationIdsPlaintext: APPLICATION_ID_HINTS,
        walletPublicKey: 'G-SIGNER',
        ...(kind === 'transfer'
          ? { onboarding: ONBOARDING, spendSource: 'pendingClaim' as const }
          : {}),
      };
      const preparedOperation = {
        kind,
        intent: {
          from: 'G-SIGNER',
          to: 'recipient',
          asset: 'USDC',
          amount: 1n,
          disclosure: {
            senderAddress: 'public' as const,
            recipientAddress: 'private' as const,
            assetAddress: 'public' as const,
            amount: 'public' as const,
          },
        },
        consumedRecords: [],
        outputRecords: [],
        submissionPayload: { operationId: 'op-1', signed: false },
        transactArtifacts,
      };

      const prepared = prepareRelayTransactPackageFromPrepared({
        prepared: preparedOperation,
        poolSelector: POOL_SELECTOR,
        zkConfigNonce: 3n,
      });

      expect(prepared.version).toBe(1);
      expect(prepared.poolSelector).toBe(POOL_SELECTOR);
      expect(prepared.zkConfigNonce).toBe(3n);
      expect(prepared.proofBytes).toBe(PROOF_BYTES);
      expect(prepared).not.toHaveProperty('walletPublicKey');
      expect(prepared).not.toHaveProperty('signer');
      expect(prepared).not.toHaveProperty('kytAuthorization');
      if (kind === 'transfer') {
        expect(prepared.onboarding).toBe(ONBOARDING);
      } else {
        expect(prepared).not.toHaveProperty('onboarding');
      }
      expect(
        readRelayTransactSupportedProfile(prepared).publicLegContext
          .publicDepositAmount,
      ).toBe(kind === 'deposit' ? '10000000' : '0');
    },
  );
});
