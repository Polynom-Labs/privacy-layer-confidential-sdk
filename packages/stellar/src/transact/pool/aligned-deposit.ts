import { PrivacyPoolSDK, scalarHexToFrDecimal } from '@auditable/privacy-pool-zk-sdk';
import type { DepositObject } from '@auditable/privacy-pool-zk-sdk';
import {
  decodePrivateAddress,
  recipientPublicKeysDecimalFromPrivateAddress,
} from '../private-address/codec.js';
import { tokenAddressToAssetLeg } from '../proofs/transaction-input.js';
import { resolvePoolApplicationId } from '../audit/parameters.js';
import type { AlignedDepositSlot } from '../pool/proof-types.js';

const SAMPLE_SCALAR_ATTEMPTS = 10;

function escrowDepositFields(parameters: {
  escrowNonce?: string;
  recipientHi?: string;
  recipientLo?: string;
}): Partial<Pick<DepositObject, 'escrowNonce' | 'recipientStellar'>> {
  if (!parameters.recipientHi || !parameters.recipientLo) {
    return {};
  }
  return {
    ...(parameters.escrowNonce ? { escrowNonce: parameters.escrowNonce } : {}),
    recipientStellar: [parameters.recipientHi, parameters.recipientLo],
  };
}

function sampleValidDepositScalarHex(): string {
  for (let index = 0; index < SAMPLE_SCALAR_ATTEMPTS; index++) {
    const candidate = PrivacyPoolSDK.generateRandomScalarHex32();
    try {
      scalarHexToFrDecimal(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error('could not sample valid depositor ephemeral scalar');
}

export async function buildAlignedDepositSlotForSdk(
  sdk: PrivacyPoolSDK,
  applicationId: string,
  parameters: {
    privateAddressStpl1: string;
    amountStroops: bigint;
    tokenAddress: string;
    escrowNonce?: string;
    recipientHi?: string;
    recipientLo?: string;
  },
): Promise<AlignedDepositSlot> {
  const privateAddressPoint = decodePrivateAddress(parameters.privateAddressStpl1);
  const scalarHex = sampleValidDepositScalarHex();
  const [assetHi, assetLo] = tokenAddressToAssetLeg(parameters.tokenAddress);
  const resolvedApplicationId = resolvePoolApplicationId(applicationId);
  const generated = sdk.generateCoinForDepositWithOwnerPubHex(
    scalarHex,
    privateAddressPoint.x,
    privateAddressPoint.y,
    parameters.amountStroops,
    assetHi,
    assetLo,
    resolvedApplicationId,
  );
  const recipientPublicKeys = recipientPublicKeysDecimalFromPrivateAddress(
    parameters.privateAddressStpl1,
  ) as [string, string];
  const deposit: DepositObject = {
    value: generated.coin.value,
    nullifier: generated.coin.nullifier,
    ephemeralKeyScalar: scalarHexToFrDecimal(scalarHex),
    asset: [generated.coin.asset_hi, generated.coin.asset_lo],
    applicationId: resolvedApplicationId,
    recipientPublicKeys,
    ...escrowDepositFields(parameters),
  };
  return {
    deposit,
    commitment_hex: generated.commitment_hex,
    coin: generated.coin,
    depositScalarHex: scalarHex,
    precommitementHex: generated.precommitementHex,
  };
}
