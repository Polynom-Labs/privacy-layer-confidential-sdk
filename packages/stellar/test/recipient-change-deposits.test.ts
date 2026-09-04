import { afterEach, describe, expect, it } from 'vitest';
import type { CoinData, DepositObject } from '@auditable/privacy-pool-zk-sdk';
import {
  configurePrivacyPoolService,
  type PrivacyPoolService,
} from '../src/transact/index.js';
import { buildRecipientAndOptionalChangeDeposits } from '../src/transact/proofs/confidential/recipient-change-deposits.js';
import {
  buildSenderTransferDepositsAndPublicInput,
  stampWithdrawEscrowLimbs,
} from '../src/transact/proofs/confidential/shared.js';
import type { AlignedDepositSlot } from '../src/transact/pool/proof-types.js';
import type { TransferEscrowSend } from '../src/transact/environment/types.js';
import { encodePrivateAddressFromHexCoordinates } from '../src/transact/private-address/codec.js';

const SENDER_STPL1 = 'stpl1sendersregisteredaddress';
const RECIPIENT_STPL1 = 'stpl1derivedescrowforjohn';
const JOHN_REGISTERED_STPL1 = encodePrivateAddressFromHexCoordinates(
  '11'.repeat(32),
  '22'.repeat(32),
);
const TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const JOHN_HI = '31415926535897932384626433832795';
const JOHN_LO = '27182818284590452353602874713526';
const ESCROW_SEND: TransferEscrowSend = {
  nonceDecimal: '99',
  recipientHi: JOHN_HI,
  recipientLo: JOHN_LO,
  recipientStellarAddress: 'GBXI7263ER2GILUOFLOUK6UXSZ5EGTC7SXFVDP4BPLFQXCZHVM54M5GR',
};

type DepositCall = {
  privateAddressStpl1: string;
  amountStroops: bigint;
  tokenAddress: string;
  escrowNonce?: string;
  recipientHi?: string;
  recipientLo?: string;
};

const depositCalls: DepositCall[] = [];

function slotFromCall(input: DepositCall): AlignedDepositSlot {
  const deposit: DepositObject = {
    value: input.amountStroops.toString(),
    nullifier: 'n',
    ephemeralKeyScalar: '1',
    asset: ['0', '0'],
    applicationId: '1',
    recipientPublicKeys: ['11', '22'],
    ...(input.escrowNonce ? { escrowNonce: input.escrowNonce } : {}),
    ...(input.recipientHi && input.recipientLo
      ? { recipientStellar: [input.recipientHi, input.recipientLo] }
      : {}),
  };
  const coin: CoinData = {
    value: input.amountStroops.toString(),
    nullifier: 'n',
    secret: `spend:${input.privateAddressStpl1}`,
    commitment: 'c',
    asset_hi: '0',
    asset_lo: '0',
  };
  return {
    deposit,
    commitment_hex: 'cc',
    coin,
    depositScalarHex: 'aa',
    precommitementHex: 'bb',
  };
}

function installRecordingPoolService(): void {
  depositCalls.length = 0;
  configurePrivacyPoolService({
    buildAlignedDepositSlot: async (input: DepositCall) => {
      depositCalls.push(input);
      return slotFromCall(input);
    },
  } as unknown as PrivacyPoolService);
}

afterEach(() => {
  depositCalls.length = 0;
});

describe('escrow transfer change-note witness', () => {
  it('proves a live change output with public escrow John and a sender-spendable coin', async () => {
    installRecordingPoolService();
    const built = await buildRecipientAndOptionalChangeDeposits({
      recipientPrivateAddressStpl1: RECIPIENT_STPL1,
      transferStroops: 4_000_000n,
      changeStroops: 6_000_000n,
      selfPrivateAddressStpl1ForChange: SENDER_STPL1,
      tokenAddress: TOKEN,
      escrowSend: ESCROW_SEND,
    });

    const recipientDeposit = built.deposits[0];
    const changeDeposit = built.deposits[1];
    if (recipientDeposit === 'dummy' || changeDeposit === 'dummy') {
      throw new Error('expected live recipient and change deposits');
    }
    expect(changeDeposit.value).toBe('6000000');
    expect(recipientDeposit.recipientStellar).toEqual([JOHN_HI, JOHN_LO]);
    expect(changeDeposit.recipientStellar).toBeUndefined();
    expect(changeDeposit.escrowNonce).toBeUndefined();
    expect(built.changeCoin?.coin.secret).toBe(`spend:${SENDER_STPL1}`);
    expect(built.changeCoin?.coin.secret).not.toBe(`spend:${RECIPIENT_STPL1}`);

    const changeCall = depositCalls.find((call) => call.amountStroops === 6_000_000n);
    expect(changeCall?.privateAddressStpl1).toBe(SENDER_STPL1);
    expect(changeCall?.recipientHi).toBeUndefined();
    expect(changeCall?.recipientLo).toBeUndefined();
    expect(changeCall?.escrowNonce).toBeUndefined();
  });

  it('keeps registered-transfer change recipientStellar unset', async () => {
    installRecordingPoolService();
    const built = await buildRecipientAndOptionalChangeDeposits({
      recipientPrivateAddressStpl1: RECIPIENT_STPL1,
      transferStroops: 4_000_000n,
      changeStroops: 6_000_000n,
      selfPrivateAddressStpl1ForChange: SENDER_STPL1,
      tokenAddress: TOKEN,
    });

    const changeDeposit = built.deposits[1];
    if (changeDeposit === 'dummy') {
      throw new Error('expected a live change deposit');
    }
    expect(changeDeposit.recipientStellar).toBeUndefined();
    expect(built.changeCoin?.coin.secret).toBe(`spend:${SENDER_STPL1}`);
    const changeCall = depositCalls.find((call) => call.amountStroops === 6_000_000n);
    expect(changeCall?.recipientHi).toBeUndefined();
    expect(changeCall?.recipientLo).toBeUndefined();
  });

  it('leaves padding at value 0 so the escrow bind stays disabled', async () => {
    installRecordingPoolService();
    const built = await buildRecipientAndOptionalChangeDeposits({
      recipientPrivateAddressStpl1: RECIPIENT_STPL1,
      transferStroops: 4_000_000n,
      changeStroops: 0n,
      selfPrivateAddressStpl1ForChange: SENDER_STPL1,
      tokenAddress: TOKEN,
      escrowSend: ESCROW_SEND,
    });

    const padding = built.deposits[1];
    if (padding === 'dummy') {
      throw new Error('expected a padding deposit');
    }
    expect(padding.value).toBe('0');
    expect(built.changeCoin).toBeUndefined();
  });

  it('keeps escrow-create public limbs at zero so the recipient stays private', async () => {
    installRecordingPoolService();
    const built = await buildSenderTransferDepositsAndPublicInput({
      senderPrivKeyScalarHex:
        '304c151b0d104df797d473cc6ee1e85769d615744d0ff7eb1bfb8d10473fc314',
      recipientPrivateAddressStpl1: RECIPIENT_STPL1,
      transferStroops: 4_000_000n,
      changeStroops: 6_000_000n,
      selfPrivateAddressStpl1ForChange: SENDER_STPL1,
      tokenAddress: TOKEN,
      stateRoot: '1',
      escrowSend: ESCROW_SEND,
    });
    const recipientDeposit = built.deposits[0];
    const changeDeposit = built.deposits[1];
    if (recipientDeposit === 'dummy' || changeDeposit === 'dummy') {
      throw new Error('expected live recipient and change deposits');
    }
    expect(built.publicInput.escrowRecipientHi).toBe('0');
    expect(built.publicInput.escrowRecipientLo).toBe('0');
    expect(built.publicInput.sweepOutputOwnerPubX).toBe('0');
    expect(built.publicInput.sweepOutputOwnerPubY).toBe('0');
    expect(built.publicInput.withdrawAddressHi).toBe('0');
    expect(built.publicInput.withdrawAddressLo).toBe('0');
    expect(recipientDeposit.recipientStellar).toEqual([JOHN_HI, JOHN_LO]);
    expect(recipientDeposit.escrowNonce).toBe('99');
    expect(changeDeposit.recipientStellar).toBeUndefined();
    expect(built.changeCoin?.coin.secret).toBe(`spend:${SENDER_STPL1}`);
  });

  it('stamps claimant limbs on the sweep output so the live output bind can pass', async () => {
    installRecordingPoolService();
    const built = await buildSenderTransferDepositsAndPublicInput({
      senderPrivKeyScalarHex:
        '304c151b0d104df797d473cc6ee1e85769d615744d0ff7eb1bfb8d10473fc314',
      recipientPrivateAddressStpl1: JOHN_REGISTERED_STPL1,
      transferStroops: 4_000_000n,
      changeStroops: 0n,
      selfPrivateAddressStpl1ForChange: SENDER_STPL1,
      tokenAddress: TOKEN,
      stateRoot: '1',
      escrowClaimantLimbs: {
        recipientHi: JOHN_HI,
        recipientLo: JOHN_LO,
      },
    });
    const recipientDeposit = built.deposits[0];
    if (recipientDeposit === 'dummy') {
      throw new Error('expected a live sweep output deposit');
    }
    expect(built.publicInput.escrowRecipientHi).toBe(JOHN_HI);
    expect(built.publicInput.escrowRecipientLo).toBe(JOHN_LO);
    expect(built.publicInput.withdrawAddressHi).toBe('0');
    expect(built.publicInput.withdrawAddressLo).toBe('0');
    expect(built.publicInput.sweepOutputOwnerPubX).toBe(
      BigInt(`0x${'11'.repeat(32)}`).toString(),
    );
    expect(built.publicInput.sweepOutputOwnerPubY).toBe(
      BigInt(`0x${'22'.repeat(32)}`).toString(),
    );
    expect(recipientDeposit.recipientStellar).toBeUndefined();
    expect(recipientDeposit.escrowNonce).toBeUndefined();
  });

  it('keeps registered-transfer public escrow limbs at 0', async () => {
    installRecordingPoolService();
    const built = await buildSenderTransferDepositsAndPublicInput({
      senderPrivKeyScalarHex:
        '304c151b0d104df797d473cc6ee1e85769d615744d0ff7eb1bfb8d10473fc314',
      recipientPrivateAddressStpl1: RECIPIENT_STPL1,
      transferStroops: 4_000_000n,
      changeStroops: 6_000_000n,
      selfPrivateAddressStpl1ForChange: SENDER_STPL1,
      tokenAddress: TOKEN,
      stateRoot: '1',
    });
    expect(built.publicInput.escrowRecipientHi).toBe('0');
    expect(built.publicInput.escrowRecipientLo).toBe('0');
    expect(built.publicInput.withdrawAddressHi).toBe('0');
    expect(built.publicInput.withdrawAddressLo).toBe('0');
    const changeDeposit = built.deposits[1];
    if (changeDeposit === 'dummy') {
      throw new Error('expected a live change deposit');
    }
    expect(changeDeposit.recipientStellar).toBeUndefined();
  });

  it('stamps public escrow limbs onto the live spent input so the input bind can pass', () => {
    const spent = {
      value: '10000000',
      recipientStellar: ['0', '0'] as [string, string],
    };
    const stamped = stampWithdrawEscrowLimbs(spent, {
      escrowRecipientHi: JOHN_HI,
      escrowRecipientLo: JOHN_LO,
    });
    expect(stamped.recipientStellar).toEqual([JOHN_HI, JOHN_LO]);
    expect(stampWithdrawEscrowLimbs(spent).recipientStellar).toEqual(['0', '0']);
  });
});
