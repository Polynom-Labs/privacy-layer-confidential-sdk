import { describe, expect, it } from 'vitest';
import { assertEscrowSweepClaimant } from '../src/transact/escrow/assert-escrow-sweep-claimant.js';
import { prepareEscrowSweepOperation } from '../src/transact/escrow/prepare-escrow-sweep.js';
import { reconstructEscrowNote } from '../src/transact/escrow/reconstruct-escrow-note.js';
import {
  isEscrowSweepSpend,
  nullifierCheckSpendScalarHex,
  requireEscrowSpendScalarHex,
} from '../src/transact/escrow/require-escrow-spend-scalar.js';
import {
  isEscrowPreparedOperation,
  requiredSubmissionMethod,
  SUBMISSION_METHOD,
} from '../src/transact/index.js';
import type { ReconstructedEscrowNote } from '../src/transact/escrow/reconstruct-escrow-note.js';

const CLAIMANT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const OTHER = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBH5C';
const REGISTERED_PA = 'stpl1registeredpermanent';
const POOL = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const DERIVED_ESCROW_FIXTURE = {
  scalarHex: '304c151b0d104df797d473cc6ee1e85769d615744d0ff7eb1bfb8d10473fc314',
  pointXHex: '1212fec80b675a524b5ffa32723fdb17e5e7923e4d9609bff8cc56a472b6e35f',
  pointYHex: '0d2002e37a3f40a3aee753a5e517b356371958198b6c735703ad2756d674d208',
} as const;

function reconstructedNote(): ReconstructedEscrowNote {
  return {
    coin: {
      value: '100',
      nullifier: '1',
      secret: '2',
      commitment: '3',
      asset_hi: '4',
      asset_lo: '5',
    },
    scalarHex: DERIVED_ESCROW_FIXTURE.scalarHex,
    privateAddressStpl1: 'stpl1derivedescrow',
    recipientHi: '11',
    recipientLo: '22',
    nonceDecimal: '99',
    tokenAddress: TOKEN,
    commitmentHex: 'aa'.repeat(32),
  };
}

describe('escrow sweep claimant authorization', () => {
  it('refuses a nonce holder who is not the connected account', () => {
    expect(() =>
      assertEscrowSweepClaimant({
        walletPublicKey: OTHER,
        claimantAddress: CLAIMANT,
      }),
    ).toThrow(/connected account that owns the note/i);
  });

  it('lets the connected account that owns the note continue', () => {
    expect(() =>
      assertEscrowSweepClaimant({
        walletPublicKey: CLAIMANT,
        claimantAddress: CLAIMANT,
      }),
    ).not.toThrow();
  });
});

describe('prepareEscrowSweepOperation', () => {
  it('stamps the claimant address and spend scalar without a transaction signature', () => {
    const prepared = prepareEscrowSweepOperation({
      walletPublicKey: CLAIMANT,
      claimantAddress: CLAIMANT,
      registeredPrivateAddress: REGISTERED_PA,
      reconstructed: reconstructedNote(),
      poolContract: POOL,
      asset: TOKEN,
    });
    expect(isEscrowPreparedOperation(prepared)).toBe(true);
    expect(prepared.transactArtifacts?.escrowRecipient).toBe(CLAIMANT);
    expect(prepared.transactArtifacts?.escrowSpendScalarHex).toBe(
      DERIVED_ESCROW_FIXTURE.scalarHex,
    );
    expect(prepared.transactArtifacts?.escrowClaimantLimbs).toEqual({
      recipientHi: '11',
      recipientLo: '22',
      nonceDecimal: '99',
    });
    expect(prepared.submissionPayload.signed).toBe(false);
    expect(requiredSubmissionMethod(prepared)).toBe(SUBMISSION_METHOD.direct);
    expect(prepared.consumedRecords[0]?.id).toBe(reconstructedNote().commitmentHex);
    expect(prepared.consumedRecords[0]?.owner).toBe(CLAIMANT);
    expect(JSON.stringify(prepared.outputRecords)).not.toMatch(/pending-output/);
    expect(requireEscrowSpendScalarHex(prepared.transactArtifacts)).toBe(
      DERIVED_ESCROW_FIXTURE.scalarHex,
    );
    expect(nullifierCheckSpendScalarHex(prepared.transactArtifacts)).toBe(
      DERIVED_ESCROW_FIXTURE.scalarHex,
    );
  });

  it('refuses to fall back to a registry spend scalar for an escrow sweep', () => {
    expect(() =>
      requireEscrowSpendScalarHex({
        spendSource: 'escrow',
      }),
    ).toThrow(/reconstructed note owner scalar/i);
    expect(
      nullifierCheckSpendScalarHex({ spendSource: 'privateAddress' }),
    ).toBeUndefined();
  });

  it('does not treat an unregistered escrow send as a sweep spend', () => {
    const sendArtifacts = {
      spendSource: 'escrow' as const,
      escrowSend: true,
    };
    expect(isEscrowSweepSpend(sendArtifacts)).toBe(false);
    expect(nullifierCheckSpendScalarHex(sendArtifacts)).toBeUndefined();
    expect(() => requireEscrowSpendScalarHex(sendArtifacts)).toThrow(
      /spendSource escrow/i,
    );
  });

  it('uses the derived escrow scalar only for sweep spends', () => {
    expect(
      isEscrowSweepSpend({
        spendSource: 'escrow',
        escrowSpendScalarHex: DERIVED_ESCROW_FIXTURE.scalarHex,
      }),
    ).toBe(true);
    expect(isEscrowSweepSpend({ spendSource: 'privateAddress' })).toBe(false);
    expect(isEscrowSweepSpend(undefined)).toBe(false);
  });

  it('refuses to build a sweep package for a different G-address', () => {
    expect(() =>
      prepareEscrowSweepOperation({
        walletPublicKey: OTHER,
        claimantAddress: CLAIMANT,
        registeredPrivateAddress: REGISTERED_PA,
        reconstructed: reconstructedNote(),
        poolContract: POOL,
        asset: TOKEN,
      }),
    ).toThrow(/connected account that owns the note/i);
  });
});

describe('reconstructEscrowNote', () => {
  it('rebuilds the coin from the persisted nonce without needing the account signature', async () => {
    const reconstructed = await reconstructEscrowNote({
      claimantAddress: CLAIMANT,
      nonceDecimal: '0',
      seq: 0,
      events: [
        {
          outputIndex: 0,
          commitmentHashHex: 'bb'.repeat(32),
          createdEphemeralKey: ['1', '2'],
          ciphertext: ['3', '4', '5', '6', '7', '8'],
          tag: '9',
        },
      ],
      deriveKey: async () => DERIVED_ESCROW_FIXTURE,
      decrypt: async () => ({
        value: '100',
        assetHi: '4',
        assetLo: '5',
        nullifier: '1',
        secret: '2',
        applicationId: '0',
        commitmentHex: 'cc'.repeat(32),
        commitmentMatches: true,
      }),
    });
    expect(reconstructed.coin.value).toBe('100');
    expect(reconstructed.coin.application_id).toBe('0');
    expect(reconstructed.scalarHex).toBe(DERIVED_ESCROW_FIXTURE.scalarHex);
  });
});
