import {
  ed25519PubkeyPayloadHexToWithdrawFrDecimals,
  withdrawObjectFromMerkleWitness,
} from '@auditable/privacy-pool-zk-sdk';
import type {
  CoinData,
  PrivacyPoolSDK,
  StateFile,
} from '@auditable/privacy-pool-zk-sdk';
import { StrKey } from '@stellar/stellar-sdk';
import { Buffer } from 'buffer';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../../encoding/priv-key-scalar-from-recipient-hex.js';

export const MIN_CONFIDENTIAL_TRANSFER_STROOPS = 1n;
export const ZERO_STROOPS = 0n;

type LeafEphemeralCoords = { x: string; y: string };

export function leafEphemeralCoords(xHex: string, yHex: string): LeafEphemeralCoords {
  const coords = {} as LeafEphemeralCoords;
  Object.defineProperty(coords, 'x', {
    value: xHex,
    enumerable: true,
    writable: true,
  });
  Object.defineProperty(coords, 'y', {
    value: yHex,
    enumerable: true,
    writable: true,
  });
  return coords;
}

export function withdrawWitnessForCoin(parameters: {
  sdk: PrivacyPoolSDK;
  coin: CoinData;
  state: StateFile;
  xHex: string;
  yHex: string;
  applicationId: string;
}) {
  const { sdk, coin, state, xHex, yHex } = parameters;
  const witness = sdk.buildWithdrawMerkleWitness(coin, state);
  const withdrawApplicationId = coin.application_id ?? parameters.applicationId;
  const withdrawObject = withdrawObjectFromMerkleWitness(
    witness,
    leafEphemeralCoords(xHex, yHex),
    withdrawApplicationId,
  );
  return { witness, withdrawObject };
}

export function dualWithdrawLegsWithSharedRoot(parameters: {
  sdk: PrivacyPoolSDK;
  coinA: CoinData;
  coinB: CoinData;
  state: StateFile;
  ephemeralA: { xHex: string; yHex: string };
  ephemeralB: { xHex: string; yHex: string };
  applicationId: string;
}) {
  const legA = withdrawWitnessForCoin({
    sdk: parameters.sdk,
    coin: parameters.coinA,
    state: parameters.state,
    xHex: parameters.ephemeralA.xHex,
    yHex: parameters.ephemeralA.yHex,
    applicationId: parameters.applicationId,
  });
  const legB = withdrawWitnessForCoin({
    sdk: parameters.sdk,
    coin: parameters.coinB,
    state: parameters.state,
    xHex: parameters.ephemeralB.xHex,
    yHex: parameters.ephemeralB.yHex,
    applicationId: parameters.applicationId,
  });
  if (legA.witness.stateRoot !== legB.witness.stateRoot) {
    throw new Error('Merkle state root mismatch between input coins');
  }
  return { legA, legB };
}

export function senderWithdrawFrAndScalar(parameters: {
  senderGAddress: string;
  senderPrivKeyScalarHex: string;
}): {
  hi: string;
  lo: string;
  privKeyScalar: string;
} {
  const pkRaw = StrKey.decodeEd25519PublicKey(parameters.senderGAddress);
  const pkHex = Buffer.from(pkRaw).toString('hex');
  const { hi, lo } = ed25519PubkeyPayloadHexToWithdrawFrDecimals(pkHex);
  const privKeyScalar = privKeyScalarDecimalFromRecipientScalarHex(
    parameters.senderPrivKeyScalarHex,
  );
  return { hi, lo, privKeyScalar };
}

export function requireChangeRecipientWhenPartial(
  changeStroops: bigint,
  selfPrivateAddressStpl1ForChange: string | undefined,
): void {
  if (changeStroops > ZERO_STROOPS) {
    const stpl1 = selfPrivateAddressStpl1ForChange?.trim() ?? '';
    if (!stpl1) {
      throw new Error(
        'Private address is required to receive the remaining balance after a partial transfer',
      );
    }
  }
}

export function changeStroopsAfterDualTransfer(
  transferStroops: bigint,
  totalNotes: bigint,
): bigint {
  if (transferStroops < MIN_CONFIDENTIAL_TRANSFER_STROOPS) {
    throw new Error('Transfer amount must be positive');
  }
  if (transferStroops > totalNotes) {
    throw new Error('Transfer amount exceeds combined note value');
  }
  return totalNotes - transferStroops;
}
