import { executionError, insufficientStateError } from '@arcanetech/privacy-sdk-core';
import { readNullifierConsumedOnChain } from '../../contracts/pool/pool-domain-service.js';
import { requireContractContext } from '../../contracts/contract-context.js';
import { requireCoinNoteFromRecord } from '../private-address/record-coin.js';
import { getPrivacyPoolService } from '../pool/singleton.js';
import { ensureSenderPrivKeyScalarHex } from '../engine/prepare/shared.js';
import { privKeyScalarDecimalFromRecipientScalarHex } from '../encoding/priv-key-scalar-from-recipient-hex.js';
import type { StellarPrivateRecord } from '../../types.js';
import type { StellarTransactEnvironment } from '../environment/types.js';

async function readPrivateRecordNullifierSpendStatus(input: {
  record: StellarPrivateRecord;
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
  poolContractId?: string;
}): Promise<{ spent: boolean; nullifierHashHex: string }> {
  const coin = requireCoinNoteFromRecord(input.record);
  const privateAddress = input.record.privateAddress?.trim();
  if (!privateAddress) {
    throw executionError(
      'Private record is missing a private address; cannot derive the owner-bound spend scalar.',
      'validation',
      {
        reason: 'private_record_missing_private_address',
        recordId: input.record.id,
      },
    );
  }
  const scalarHex = await ensureSenderPrivKeyScalarHex(
    input.environment,
    privateAddress,
    input.walletPublicKey,
  );
  const nullifierHashHex = await getPrivacyPoolService().calculateNullifierHash(
    coin.nullifier,
    privKeyScalarDecimalFromRecipientScalarHex(scalarHex),
  );
  const contractContext = requireContractContext(input.environment);
  const poolContractId =
    input.poolContractId?.trim() || contractContext.network.poolContract;
  const spent = await readNullifierConsumedOnChain({
    contractContext,
    poolContractId,
    walletPublicKey: input.walletPublicKey.trim(),
    nullifierHashHex,
  });
  return { spent, nullifierHashHex };
}

export async function verifyPrivateRecordsNullifiersBeforeExecute(input: {
  records: StellarPrivateRecord[];
  environment: StellarTransactEnvironment;
  walletPublicKey: string;
  poolContractId?: string;
}): Promise<void> {
  for (const record of input.records) {
    const status = await readPrivateRecordNullifierSpendStatus({
      record,
      environment: input.environment,
      walletPublicKey: input.walletPublicKey,
      ...(input.poolContractId ? { poolContractId: input.poolContractId } : {}),
    });
    if (status.spent) {
      throw executionError(
        'Private input note nullifier was already spent on-chain.',
        'validation',
        {
          reason: 'private_record_nullifier_spent',
          recordId: record.id,
          nullifierHashHex: status.nullifierHashHex,
        },
      );
    }
  }
}

export async function assertPrivateRecordsNullifiersAvailable(input: {
  records: StellarPrivateRecord[];
  walletPublicKey: string;
  checkNullifierSpent?: (parameters: {
    nullifier: string;
    walletPublicKey: string;
    privKeyScalarHex?: string;
    privateAddressStpl1?: string;
  }) => Promise<boolean>;
}): Promise<void> {
  if (!input.checkNullifierSpent) {
    return;
  }
  for (const record of input.records) {
    const coin = requireCoinNoteFromRecord(record);
    const spent = await input.checkNullifierSpent({
      nullifier: coin.nullifier,
      walletPublicKey: input.walletPublicKey,
      ...(record.privateAddress ? { privateAddressStpl1: record.privateAddress } : {}),
    });
    if (spent) {
      throw insufficientStateError(
        'private_record_nullifier_spent',
        'Private input note nullifier was already spent on-chain.',
        { recordId: record.id },
      );
    }
  }
}
