import type { CoinData, DepositSlot } from '@auditable/privacy-pool-zk-sdk';
import { getPrivacyPoolService } from '../pool/singleton.js';
import { ZERO_STROOPS } from '../proofs/confidential/helpers.js';
import type { AlignedDepositSlot } from '../pool/proof-types.js';

type ChangeCoin = {
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
};

async function buildPaddingDepositPair(
  recipientPrivateAddressStpl1: string,
  tokenAddress: string,
  recipientDeposit: DepositSlot,
): Promise<[DepositSlot, DepositSlot]> {
  const paddingSlot = await getPrivacyPoolService().buildAlignedDepositSlot({
    privateAddressStpl1: recipientPrivateAddressStpl1,
    amountStroops: ZERO_STROOPS,
    tokenAddress,
  });
  return [recipientDeposit, paddingSlot.deposit];
}

async function buildChangeDepositPair(parameters: {
  recipientPrivateAddressStpl1: string;
  selfPrivateAddressStpl1ForChange: string;
  changeStroops: bigint;
  tokenAddress: string;
  recipientDeposit: DepositSlot;
}): Promise<{ deposits: [DepositSlot, DepositSlot]; changeCoin: ChangeCoin }> {
  const changeSlot = await getPrivacyPoolService().buildAlignedDepositSlot({
    privateAddressStpl1: parameters.selfPrivateAddressStpl1ForChange.trim(),
    amountStroops: parameters.changeStroops,
    tokenAddress: parameters.tokenAddress,
  });
  return {
    deposits: [parameters.recipientDeposit, changeSlot.deposit],
    changeCoin: {
      commitment_hex: changeSlot.commitment_hex,
      coin: changeSlot.coin,
      depositScalarHex: changeSlot.depositScalarHex,
      precommitementHex: changeSlot.precommitementHex,
    },
  };
}

export async function buildRecipientAndOptionalChangeDeposits(parameters: {
  recipientPrivateAddressStpl1: string;
  transferStroops: bigint;
  changeStroops: bigint;
  selfPrivateAddressStpl1ForChange: string | undefined;
  tokenAddress: string;
}): Promise<{
  recipientSlot: AlignedDepositSlot;
  deposits: [DepositSlot, DepositSlot];
  changeCoin?: ChangeCoin;
}> {
  const recipientPrivateAddress = parameters.recipientPrivateAddressStpl1.trim();
  const recipientSlot = await getPrivacyPoolService().buildAlignedDepositSlot({
    privateAddressStpl1: recipientPrivateAddress,
    amountStroops: parameters.transferStroops,
    tokenAddress: parameters.tokenAddress,
  });
  if (parameters.changeStroops <= ZERO_STROOPS) {
    return {
      recipientSlot,
      deposits: await buildPaddingDepositPair(
        recipientPrivateAddress,
        parameters.tokenAddress,
        recipientSlot.deposit,
      ),
    };
  }
  const changeResult = await buildChangeDepositPair({
    recipientPrivateAddressStpl1: recipientPrivateAddress,
    selfPrivateAddressStpl1ForChange: parameters.selfPrivateAddressStpl1ForChange!,
    changeStroops: parameters.changeStroops,
    tokenAddress: parameters.tokenAddress,
    recipientDeposit: recipientSlot.deposit,
  });
  return {
    recipientSlot,
    deposits: changeResult.deposits,
    changeCoin: changeResult.changeCoin,
  };
}
