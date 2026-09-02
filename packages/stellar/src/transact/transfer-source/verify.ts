import { executionError } from '@arcanetech/privacy-sdk-core';
import { readNullifierConsumedOnChain } from '../../contracts/pool/pool-domain-service.js';
import { requireContractContext } from '../../contracts/contract-context.js';
import { getPrivacyPoolService } from '../pool/singleton.js';
import type { StellarPendingClaim } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';
import {
  assertPendingClaimOwner,
  pendingClaimToCoin,
  recoveryScalarHexFromClaim,
} from './resolve.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../encoding/priv-key-scalar-from-recipient-hex.js';

export async function verifyPendingClaimBeforeExecute(input: {
  claim: StellarPendingClaim;
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
  poolContractId?: string;
}): Promise<void> {
  try {
    assertPendingClaimOwner({
      claim: input.claim,
      walletPublicKey: input.walletPublicKey,
    });
    const coin = pendingClaimToCoin(input.claim);
    const privKeyScalar = privKeyScalarDecimalFromRecipientScalarHex(
      recoveryScalarHexFromClaim(input.claim),
    );
    const nullifierHashHex = await getPrivacyPoolService().calculateNullifierHash(
      coin.nullifier,
      privKeyScalar,
    );
    const contractContext = requireContractContext(input.environment);
    const spent = await readNullifierConsumedOnChain({
      contractContext,
      poolContractId:
        input.poolContractId?.trim() || contractContext.network.poolContract,
      walletPublicKey: input.walletPublicKey.trim(),
      nullifierHashHex,
    });
    if (spent) {
      throw executionError(
        'Pending claim nullifier was already spent on-chain.',
        'validation',
        { reason: 'pending_claim_nullifier_spent' },
      );
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'insufficient_state'
    ) {
      throw executionError(
        error instanceof Error ? error.message : 'Pending claim owner mismatch.',
        'validation',
        { reason: 'pending_claim_owner_mismatch' },
      );
    }
    throw error;
  }
}
