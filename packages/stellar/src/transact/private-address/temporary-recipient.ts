import { PrivacyPoolSDK } from '@auditable/privacy-pool-zk-sdk';
import { getPrivacyPoolService } from '../pool/singleton.js';
import { encodePrivateAddressFromHexCoordinates } from './codec.js';

const COORDINATE_HEX_LENGTH = 64;

export async function generateRandomDepositScalarHex(): Promise<string> {
  await getPrivacyPoolService().getInitializedSdk();
  return PrivacyPoolSDK.generateRandomScalarHex32();
}

export async function generateTemporaryRecipientPrivateAddress(): Promise<{
  temporaryScalarHex: string;
  temporaryPrivateAddressStpl1: string;
}> {
  await getPrivacyPoolService().getInitializedSdk();
  const temporaryScalarHex = PrivacyPoolSDK.generateRandomScalarHex32();
  const sdk = await getPrivacyPoolService().getInitializedSdk();
  const point = sdk.ecdhEphemeralPublicKeyFromScalarHex(temporaryScalarHex);
  const publicKeyXHex = point.x.padStart(COORDINATE_HEX_LENGTH, '0');
  const publicKeyYHex = point.y.padStart(COORDINATE_HEX_LENGTH, '0');
  return {
    temporaryScalarHex,
    temporaryPrivateAddressStpl1: encodePrivateAddressFromHexCoordinates(
      publicKeyXHex,
      publicKeyYHex,
    ),
  };
}
