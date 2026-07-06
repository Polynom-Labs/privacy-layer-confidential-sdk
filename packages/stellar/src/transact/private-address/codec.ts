import {
  buildStealthAddressSignMessage,
  decodeStealthAddress,
  encodeStealthAddress,
  recipientPublicKeysDecimalFromStealthAddress,
} from '@auditable/privacy-pool-zk-sdk';
import type { PrivacyPoolSDK } from '@auditable/privacy-pool-zk-sdk';
export { DEFAULT_STEALTH_SIGN_NONCE as DEFAULT_PRIVATE_ADDRESS_SIGN_NONCE } from '@auditable/privacy-pool-zk-sdk';

type DecodedPrivateAddress = { x: string; y: string };
type PrivateAddressDecoder = (value: string) => DecodedPrivateAddress;
type PrivateAddressEncoder = (decoded: DecodedPrivateAddress) => string;
type PrivateAddressPublicKeyReader = (value: string) => unknown;
type PrivateAddressMessageBuilder = (publicKey: string, nonce: string) => string;
type PrivateAddressGenerator = (signature: string) => string | Promise<string>;

type PrivateAddressSdk = {
  generatePrivateAddressFromStellarSignature: PrivateAddressGenerator;
};

type PrivacyPoolSdkPrivateAddressMethods = {
  generateStealthAddressFromStellarSignature?: PrivateAddressGenerator;
};

export function buildPrivateAddressSignMessage(
  publicKey: string,
  nonce: string,
): string {
  const buildMessage: PrivateAddressMessageBuilder = buildStealthAddressSignMessage;
  return buildMessage(publicKey, nonce);
}

export function decodePrivateAddress(value: string): DecodedPrivateAddress {
  const decodeAddress: PrivateAddressDecoder = decodeStealthAddress;
  return decodeAddress(value);
}

export function encodePrivateAddress(decoded: DecodedPrivateAddress): string {
  const encodeAddress: PrivateAddressEncoder = encodeStealthAddress;
  return encodeAddress(decoded);
}

export function encodePrivateAddressFromHexCoordinates(
  publicKeyXHex: string,
  publicKeyYHex: string,
): string {
  return encodePrivateAddress(
    Object.fromEntries([
      ['x', publicKeyXHex],
      ['y', publicKeyYHex],
    ]) as DecodedPrivateAddress,
  );
}

export function recipientPublicKeysDecimalFromPrivateAddress(value: string): unknown {
  const readPublicKeys: PrivateAddressPublicKeyReader =
    recipientPublicKeysDecimalFromStealthAddress;
  return readPublicKeys(value);
}

export function privateAddressSdk(sdk: PrivacyPoolSDK): PrivateAddressSdk {
  const generator = (sdk as unknown as PrivacyPoolSdkPrivateAddressMethods)
    .generateStealthAddressFromStellarSignature;
  if (typeof generator !== 'function') {
    throw new TypeError(
      'Missing privacy pool SDK method: generateStealthAddressFromStellarSignature',
    );
  }
  return {
    generatePrivateAddressFromStellarSignature: (signature) =>
      generator.call(sdk, signature),
  };
}
