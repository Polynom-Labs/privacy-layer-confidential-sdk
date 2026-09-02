import { nativeToScVal, type xdr } from '@stellar/stellar-sdk';

export function kytAuthorizationScValue(parameters: {
  expirationLedger: number;
  signature: Buffer;
}): xdr.ScVal {
  return nativeToScVal(
    {
      expiration_ledger: parameters.expirationLedger,
      signature: parameters.signature,
    },
    {
      type: {
        expiration_ledger: ['symbol', 'u32'],
        signature: ['symbol', 'bytes'],
      },
    },
  );
}
