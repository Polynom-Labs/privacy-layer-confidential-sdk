export type StellarSignTransaction = (input: {
  xdr: string;
  networkPassphrase: string;
  address: string;
}) => Promise<{ signedTxXdr: string }>;

export type GeneratedBindingSignTransaction = (
  xdrInput: string,
  options?: {
    networkPassphrase?: string;
    address?: string;
  },
) => Promise<{ signedTxXdr: string }>;

export function adaptSignTransactionForGeneratedBinding(
  signTransaction: StellarSignTransaction,
  defaults: {
    networkPassphrase: string;
    walletPublicKey: string;
  },
): GeneratedBindingSignTransaction {
  return async (xdrInput, options) => {
    const networkPassphrase =
      options?.networkPassphrase?.trim() || defaults.networkPassphrase;
    const address = options?.address?.trim() || defaults.walletPublicKey;
    return signTransaction({
      xdr: xdrInput,
      networkPassphrase,
      address,
    });
  };
}
