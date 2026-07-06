import { Buffer } from 'buffer';
import type {
  OnboardingPayload,
  OptionalPrivateAddressRegistration,
  PlaintextNote,
  PrivateAddressRegistration,
} from 'contract';
import { PrivacyPoolSDK } from '@auditable/privacy-pool-zk-sdk';
import { frDecimalToPaddedBytes32 } from '../encoding/fr-decimal-to-bytes.js';
import { getPrivacyPoolService } from '../pool/singleton.js';
import { tokenAddressToAssetLeg } from '../proofs/transaction-input.js';
import { decodePrivateAddress } from '../private-address/codec.js';

export { generateTemporaryRecipientPrivateAddress } from './recipient.js';

const COORDINATE_HEX_LENGTH = 64;

type TransferOnboardingRecipientNoteInput = {
  tokenAddress: string;
  nullifier: string;
  secret: string;
  value: string;
};

export type TemporaryRecipientKeyMaterial = {
  temporaryScalarHex: string;
  temporaryPrivateAddressStpl1: string;
};

function noneOptionalRegistration(): OptionalPrivateAddressRegistration {
  return { tag: 'None', values: undefined };
}

function coinToPlaintextNote(
  coin: TransferOnboardingRecipientNoteInput,
): PlaintextNote {
  const [assetHi, assetLo] = tokenAddressToAssetLeg(coin.tokenAddress);
  return {
    asset_hi: frDecimalToPaddedBytes32(assetHi),
    asset_lo: frDecimalToPaddedBytes32(assetLo),
    deposited_ephemeral_scalar: undefined,
    nullifier: frDecimalToPaddedBytes32(coin.nullifier),
    secret: frDecimalToPaddedBytes32(coin.secret),
    value: BigInt(coin.value),
  };
}

export async function generateRandomDepositScalarHex(): Promise<string> {
  await getPrivacyPoolService().getInitializedSdk();
  return PrivacyPoolSDK.generateRandomScalarHex32();
}

export function buildOnboardingPayload(parameters: {
  ownerStellarAddress: string;
  temporaryKey: TemporaryRecipientKeyMaterial;
  recipientNotes: TransferOnboardingRecipientNoteInput[];
  permanentPrivateAddressStpl1?: string;
}): OnboardingPayload {
  const notes = parameters.recipientNotes.map((coin) => coinToPlaintextNote(coin));
  const temporaryDecoded = decodePrivateAddress(
    parameters.temporaryKey.temporaryPrivateAddressStpl1.trim(),
  );
  let privateAddressRegistration = noneOptionalRegistration();
  if (parameters.permanentPrivateAddressStpl1?.trim()) {
    const decoded = decodePrivateAddress(
      parameters.permanentPrivateAddressStpl1.trim(),
    );
    const registration: PrivateAddressRegistration = {
      owner: parameters.ownerStellarAddress.trim(),
      public_key_x: Buffer.from(decoded.x.padStart(COORDINATE_HEX_LENGTH, '0'), 'hex'),
      public_key_y: Buffer.from(decoded.y.padStart(COORDINATE_HEX_LENGTH, '0'), 'hex'),
    };
    privateAddressRegistration = { tag: 'Some', values: [registration] };
  }
  return {
    owner: parameters.ownerStellarAddress.trim(),
    temp_public_key_x: Buffer.from(
      temporaryDecoded.x.padStart(COORDINATE_HEX_LENGTH, '0'),
      'hex',
    ),
    temp_public_key_y: Buffer.from(
      temporaryDecoded.y.padStart(COORDINATE_HEX_LENGTH, '0'),
      'hex',
    ),
    encrypted_private_key: Buffer.from(
      parameters.temporaryKey.temporaryScalarHex,
      'utf8',
    ),
    notes: { notes },
    private_address_registration: privateAddressRegistration,
  };
}

export async function buildTransferOnboardingAtExecute(
  input: import('../environment/types.js').BuildTransferOnboardingAtExecuteInput,
): Promise<OnboardingPayload> {
  return buildOnboardingPayload({
    ownerStellarAddress: input.ownerStellarAddress,
    temporaryKey: {
      temporaryScalarHex: input.temporaryRecipientKey.temporaryScalarHex,
      temporaryPrivateAddressStpl1:
        input.temporaryRecipientKey.temporaryPrivateAddressStpl1,
    },
    recipientNotes: [input.recipientNote],
  });
}
