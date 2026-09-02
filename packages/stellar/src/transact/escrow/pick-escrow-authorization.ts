import { Address, xdr } from '@stellar/stellar-sdk';

function credentialAddress(entry: xdr.SorobanAuthorizationEntry): string | undefined {
  try {
    const credentials = entry.credentials();
    if (credentials.switch().name !== 'sorobanCredentialsAddress') {
      return undefined;
    }
    return Address.fromScAddress(credentials.address().address()).toString();
  } catch {
    return undefined;
  }
}

export function pickUnsignedEscrowAuthorization(input: {
  auth: readonly xdr.SorobanAuthorizationEntry[];
  claimantAddress: string;
}): string {
  const claimant = input.claimantAddress.trim();
  const match = input.auth.find((entry) => credentialAddress(entry) === claimant);
  if (!match) {
    throw new Error('Simulation did not return a claimant authorization entry.');
  }
  return match.toXDR('base64');
}
