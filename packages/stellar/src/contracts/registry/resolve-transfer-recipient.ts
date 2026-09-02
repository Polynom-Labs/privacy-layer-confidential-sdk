import type { StellarAddress } from '../../types.js';
import { generateTemporaryRecipientPrivateAddress } from '../../transact/private-address/temporary-recipient.js';
import type { TransferRecipientExecutionContext } from '../../transact/environment/types.js';
import type { StellarContractContext } from '../contract-context.js';
import { readRegistryLookupFromChain } from './registry-domain-service.js';

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
  const temporaryKey = await generateTemporaryRecipientPrivateAddress();
  return {
    recipientPrivateAddressStpl1: temporaryKey.temporaryPrivateAddressStpl1,
    recipientStellarAddress,
    temporaryRecipientKey: temporaryKey,
  };
}
