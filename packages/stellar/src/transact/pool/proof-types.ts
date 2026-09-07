import type { CoinData, DepositObject } from '@auditable/privacy-pool-zk-sdk';

export type AlignedDepositSlot = {
  deposit: DepositObject;
  commitment_hex: string;
  coin: CoinData;
  depositScalarHex: string;
  precommitementHex: string;
};

export type KytApplicationIdHints = string[];

export type ProofResult = {
  proof_hex: string;
  public_hex: string;
  applicationIdsPlaintext: KytApplicationIdHints;
};

export type ProofWithChange = ProofResult & {
  changeCoin?: {
    commitment_hex: string;
    coin: CoinData;
    depositScalarHex: string;
    precommitementHex: string;
  };
};
