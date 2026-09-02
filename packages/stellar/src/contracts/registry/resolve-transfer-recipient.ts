import { StrKey } from '@stellar/stellar-sdk';
import type { StellarAddress } from '../../types.js';
import type { TransferRecipientExecutionContext } from '../../transact/environment/types.js';
import type { StellarContractContext } from '../contract-context.js';
import { readRegistryLookupFromChain } from './registry-domain-service.js';
import { deriveEscrowRecipientFromStellarAddress } from '../../transact/escrow/derived-escrow-recipient.js';

export async function resolveTransferRecipientFromChain(input: {
  contractContext: StellarContractContext;
  recipientStellarAddress: StellarAddress;
  walletPublicKey: StellarAddress;
  cachedLookup?: Awaited<ReturnType<typeof readRegistryLookupFromChain>> | undefined;
}): Promise<TransferRecipientExecutionContext> {
  const recipientStellarAddress = input.recipientStellarAddress.trim();
  const walletPublicKey = input.walletPublicKey.trim();
  const lookup =
    input.cachedLookup ??
    (await readRegistryLookupFromChain({
      contractContext: input.contractContext,
      owner: recipientStellarAddress,
      walletPublicKey,
    }));
  if (lookup.status === 'registered' && lookup.privateAddressStpl1?.trim()) {
    return {
      recipientPrivateAddressStpl1: lookup.privateAddressStpl1.trim(),
      recipientStellarAddress,
    };
  }
  if (!StrKey.isValidEd25519PublicKey(recipientStellarAddress)) {
    throw new Error(
      'Transfers to unregistered recipients require a Stellar G-address.',
    );
  }
  const escrow = await deriveEscrowRecipientFromStellarAddress({
    recipientStellarAddress,
  });
  return {
    recipientPrivateAddressStpl1: escrow.privateAddressStpl1,
    recipientStellarAddress,
    escrowSend: {
      nonceDecimal: escrow.nonceDecimal,
      recipientHi: escrow.recipientHi,
      recipientLo: escrow.recipientLo,
      recipientStellarAddress,
    },
  };
}
