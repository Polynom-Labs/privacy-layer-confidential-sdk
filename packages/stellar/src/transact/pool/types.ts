import type { OnboardingPayload } from '../onboarding/payload.js';

export type PoolTransactResult = {
  signAndSend: () => Promise<{
    sendTransactionResponse?: {
      hash?: string;
    };
  }>;
};

export type PoolTransactClient = {
  get_merkle_root: () => Promise<{ result: Buffer }>;
  get_commitments: () => Promise<{ result: Buffer[] }>;
  get_leaf_ephemeral: (input: {
    leaf_index: number;
  }) => Promise<{ result: { x: Buffer; y: Buffer } }>;
  is_nulifier_hash_consumed: (input: { hash: Buffer }) => Promise<{ result: boolean }>;
  transact: (parameters: {
    from: string;
    nonce: bigint;
    proof_bytes: Buffer;
    pub_signals_bytes: Buffer;
    onboarding: OnboardingPayload | undefined;
    kyt_authorization: {
      expiration_ledger: number;
      signature: Buffer;
    };
  }) => Promise<PoolTransactResult>;
};

export type PoolClientFactory = (input: {
  contractId: string;
  walletPublicKey: string;
  networkPassphrase: string;
  sorobanRpcUrl: string;
}) => PoolTransactClient;
