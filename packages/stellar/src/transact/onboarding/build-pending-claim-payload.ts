import { Buffer } from 'buffer';
import type { OnboardingPayload } from 'contract';
import { decodePrivateAddress } from '../private-address/codec.js';
import type { StellarPendingClaim } from '../../types.js';

const FIELD_HEX_LENGTH = 64;

function hexToBuffer(hex: string): Buffer {
  const clean = hex.trim().replace(/^0x/u, '');
  return Buffer.from(clean.padStart(FIELD_HEX_LENGTH, '0'), 'hex');
}

export function buildPendingClaimOnboardingPayload(input: {
  claim: StellarPendingClaim;
  permanentPrivateAddressStpl1: string;
}): OnboardingPayload {
  const ownerAddress = input.claim.owner.trim();
  const permanentPrivateAddress = input.permanentPrivateAddressStpl1.trim();
  const decoded = decodePrivateAddress(permanentPrivateAddress);
  const encryptedRecovery = input.claim.encryptedRecoveryBase64?.trim();
  if (!encryptedRecovery) {
    throw new Error('Pending claim is missing encrypted recovery data.');
  }
  return {
    owner: ownerAddress,
    temp_public_key_x: hexToBuffer(input.claim.tempPublicKeyXHex ?? ''),
    temp_public_key_y: hexToBuffer(input.claim.tempPublicKeyYHex ?? ''),
    encrypted_private_key: Buffer.from(encryptedRecovery, 'base64'),
    notes: { notes: [] },
    private_address_registration: {
      tag: 'Some',
      values: [
        {
          owner: ownerAddress,
          public_key_x: hexToBuffer(decoded.x),
          public_key_y: hexToBuffer(decoded.y),
        },
      ],
    },
  };
}
