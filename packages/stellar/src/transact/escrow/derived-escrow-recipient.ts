import { Buffer } from 'buffer';
import { StrKey } from '@stellar/stellar-sdk';
import {
  derivedEscrowKey,
  ed25519PubkeyPayloadHexToWithdrawFrDecimals,
  randomFrDecimal,
} from '@auditable/privacy-pool-zk-sdk';
import { encodePrivateAddressFromHexCoordinates } from '../private-address/codec.js';

const COORDINATE_HEX_LENGTH = 64;

export type DerivedEscrowRecipient = {
  nonceDecimal: string;
  recipientHi: string;
  recipientLo: string;
  recipientStellarAddress: string;
  privateAddressStpl1: string;
  scalarHex: string;
};

export type DerivedEscrowKeyFn = (
  nonce: bigint,
  recipientHi: bigint,
  recipientLo: bigint,
) => Promise<{
  scalarHex: string;
  pointXHex: string;
  pointYHex: string;
}>;

function stellarAccountToFieldLimbs(stellarAddress: string): {
  recipientHi: string;
  recipientLo: string;
} {
  const pkRaw = StrKey.decodeEd25519PublicKey(stellarAddress.trim());
  const pkHex = Buffer.from(pkRaw).toString('hex');
  const { hi, lo } = ed25519PubkeyPayloadHexToWithdrawFrDecimals(pkHex);
  return { recipientHi: hi, recipientLo: lo };
}

function padCoordinateHex(value: string): string {
  return value.replace(/^0x/iu, '').padStart(COORDINATE_HEX_LENGTH, '0');
}

export async function deriveEscrowRecipientFromStellarAddress(input: {
  recipientStellarAddress: string;
  nonceDecimal?: string;
  deriveKey?: DerivedEscrowKeyFn;
}): Promise<DerivedEscrowRecipient> {
  const recipientStellarAddress = input.recipientStellarAddress.trim();
  if (!StrKey.isValidEd25519PublicKey(recipientStellarAddress)) {
    throw new Error('Escrow recipient must be a Stellar G-address.');
  }
  const { recipientHi, recipientLo } = stellarAccountToFieldLimbs(
    recipientStellarAddress,
  );
  const nonceDecimal = input.nonceDecimal ?? randomFrDecimal();
  const deriveKey = input.deriveKey ?? derivedEscrowKey;
  const key = await deriveKey(
    BigInt(nonceDecimal),
    BigInt(recipientHi),
    BigInt(recipientLo),
  );
  return {
    nonceDecimal,
    recipientHi,
    recipientLo,
    recipientStellarAddress,
    privateAddressStpl1: encodePrivateAddressFromHexCoordinates(
      padCoordinateHex(key.pointXHex),
      padCoordinateHex(key.pointYHex),
    ),
    scalarHex: padCoordinateHex(key.scalarHex),
  };
}
