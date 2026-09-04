import { Buffer } from 'buffer';
import { StrKey } from '@stellar/stellar-sdk';
import { resolveTokenContractId } from '../stellar/token-contract.js';

export interface TransactionPublicLegParameters {
  publicWithdrawnAssets: Array<[string, string]>;
  publicDepositedAssets: Array<[string, string]>;
  publicDeposits: string[];
  publicWithdrawals: string[];
}

type BasePublicInput = {
  stateRoot: string;
  withdrawAddressHi?: string;
  withdrawAddressLo?: string;
  privKeyScalar: string;
  escrowRecipientHi?: string;
  escrowRecipientLo?: string;
  sweepOutputOwnerPubX?: string;
  sweepOutputOwnerPubY?: string;
};

const ZERO_PUBLIC_WITHDRAW_ADDRESS = {
  withdrawAddressHi: '0',
  withdrawAddressLo: '0',
} as const;

const CONTRACT_ADDRESS_HALF_BYTES = 16;
const CONTRACT_ADDRESS_BYTES = 32;

function bytes16ToDecimal(bytes: Uint8Array): string {
  return BigInt(`0x${Buffer.from(bytes).toString('hex')}`).toString();
}

function decimalToBytes16(value: string): Buffer {
  const hex = BigInt(value)
    .toString(16)
    .padStart(CONTRACT_ADDRESS_HALF_BYTES * 2, '0');
  if (hex.length > CONTRACT_ADDRESS_HALF_BYTES * 2) {
    throw new Error('Asset leg does not fit into 16 bytes.');
  }
  return Buffer.from(hex, 'hex');
}

function tokenAddressFrParts(tokenAddress: string): { hi: string; lo: string } {
  const normalized = resolveTokenContractId(tokenAddress);
  const payload = StrKey.decodeContract(normalized);
  const hi = bytes16ToDecimal(payload.subarray(0, CONTRACT_ADDRESS_HALF_BYTES));
  const lo = bytes16ToDecimal(
    payload.subarray(CONTRACT_ADDRESS_HALF_BYTES, CONTRACT_ADDRESS_BYTES),
  );
  return { hi, lo };
}

export function withTokenAddressPublicInputs(
  base: BasePublicInput,
  tokenAddress: string,
): Record<string, string> {
  const { hi, lo } = tokenAddressFrParts(tokenAddress);
  return {
    ...base,
    tokenAddressHi: hi,
    tokenAddressLo: lo,
    withdrawAddressHi:
      base.withdrawAddressHi ?? ZERO_PUBLIC_WITHDRAW_ADDRESS.withdrawAddressHi,
    withdrawAddressLo:
      base.withdrawAddressLo ?? ZERO_PUBLIC_WITHDRAW_ADDRESS.withdrawAddressLo,
    escrowRecipientHi: base.escrowRecipientHi ?? '0',
    escrowRecipientLo: base.escrowRecipientLo ?? '0',
    sweepOutputOwnerPubX: base.sweepOutputOwnerPubX ?? '0',
    sweepOutputOwnerPubY: base.sweepOutputOwnerPubY ?? '0',
  };
}

export function publicWithdrawAddressLimbs(parameters: {
  publicWithdrawalAmount: string;
  destinationHi: string;
  destinationLo: string;
}): {
  withdrawAddressHi: string;
  withdrawAddressLo: string;
} {
  if (parameters.publicWithdrawalAmount === '0') {
    return {
      withdrawAddressHi: ZERO_PUBLIC_WITHDRAW_ADDRESS.withdrawAddressHi,
      withdrawAddressLo: ZERO_PUBLIC_WITHDRAW_ADDRESS.withdrawAddressLo,
    };
  }
  return {
    withdrawAddressHi: parameters.destinationHi,
    withdrawAddressLo: parameters.destinationLo,
  };
}

export function tokenAddressToAssetLeg(tokenAddress: string): [string, string] {
  const { hi, lo } = tokenAddressFrParts(tokenAddress);
  return [hi, lo];
}

export function assetLegToTokenAddress(assetHi: string, assetLo: string): string {
  const payload = Buffer.concat([decimalToBytes16(assetHi), decimalToBytes16(assetLo)]);
  return StrKey.encodeContract(payload);
}

export function buildZeroPublicLegs(): TransactionPublicLegParameters {
  return {
    publicWithdrawnAssets: [['0', '0']],
    publicDepositedAssets: [['0', '0']],
    publicDeposits: ['0'],
    publicWithdrawals: ['0'],
  };
}

export function buildPublicDepositLegs(
  tokenAddress: string,
  amount: string,
): TransactionPublicLegParameters {
  const legs = buildZeroPublicLegs();
  return {
    ...legs,
    publicDepositedAssets: [tokenAddressToAssetLeg(tokenAddress)],
    publicDeposits: [amount],
  };
}

export function buildPublicWithdrawLegs(
  tokenAddress: string,
  amount: string,
): TransactionPublicLegParameters {
  const legs = buildZeroPublicLegs();
  return {
    ...legs,
    publicWithdrawnAssets: [tokenAddressToAssetLeg(tokenAddress)],
    publicWithdrawals: [amount],
  };
}
