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
  ciphertext_hex?: string;
  output_note_ephemeral_scalars?: string[];
};

export type ProofWithChange = ProofResult & {
  changeCoin?: {
    commitment_hex: string;
    coin: CoinData;
    depositScalarHex: string;
    precommitementHex: string;
  };
};

export function ciphertextArtifactsFromProof(proof: {
  ciphertext_hex?: string;
  output_note_ephemeral_scalars?: string[];
}): {
  ciphertextHex?: string;
  outputNoteEphemeralScalars?: string[];
} {
  return {
    ...(proof.ciphertext_hex === undefined
      ? {}
      : { ciphertextHex: proof.ciphertext_hex }),
    ...(proof.output_note_ephemeral_scalars === undefined
      ? {}
      : {
          outputNoteEphemeralScalars: [...proof.output_note_ephemeral_scalars],
        }),
  };
}
