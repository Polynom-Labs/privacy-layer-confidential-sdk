import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBVQTSTSIJ4UZMN5FQBFHPUIYSW3ATGSP57BZDJNKTOBNQODQTRGE4K5",
  }
} as const


/**
 * Per-application audit public key allowlist entry (runtime/config state).
 */
export interface AppAuditState {
  audit_public_key_x: Buffer;
  audit_public_key_y: Buffer;
  enabled: boolean;
}


/**
 * Ephemeral BabyJubJub / ECDH point (not hashed into the Merkle tree).
 */
export interface EphemeralKeyCoords {
  x: Buffer;
  y: Buffer;
}

/**
 * Storage key for tree leaves — each leaf stored by index for O(1) write on deposit.
 */
export type TreeDataKey = {tag: "Leaf", values: readonly [u32]} | {tag: "LeafCount", values: void} | {tag: "LeafEphemeral", values: readonly [u32]} | {tag: "PairwiseFrontier", values: void};

/**
 * Storage key for nullifiers — each nullifier hash maps to bool (consumed or not).
 */
export type NulifierDataKey = {tag: "Nulifier", values: readonly [Buffer]};

/**
 * Ring buffer of historical Merkle roots (for proofs generated against recent states).
 */
export type RootHistoryKey = {tag: "CurrentRootIndex", values: void} | {tag: "Root", values: readonly [u32]};

export const Errors = {
  1: {message:"NullifierUsed"},
  2: {message:"InsufficientBalance"},
  3: {message:"ProofVerificationFailed"},
  4: {message:"OnlyAdmin"},
  5: {message:"TreeAtCapacity"},
  6: {message:"AssociationRootMismatch"},
  7: {message:"InvalidPublicSignals"},
  8: {message:"InvalidTokenAmount"},
  /**
   * Proof `state_root` is not in the recent root history window.
   */
  9: {message:"UnknownRoot"},
  /**
   * Exactly one output commitment is non-zero; only zero/zero or two non-zero outputs are allowed.
   */
  10: {message:"InvalidCommitmentPair"},
  /**
   * Stored Merkle frontier length does not match tree depth (corrupt or outdated storage layout).
   */
  11: {message:"InvalidMerkleFrontier"},
  /**
   * KYT passage registry is not configured (required for the current layout).
   */
  12: {message:"KytRegistryMissing"},
  /**
   * Public note audit key is not registered for any enabled application.
   */
  13: {message:"UnknownAuditPublicKey"},
  /**
   * Public note audit key coordinates are not a valid BabyJubJub point.
   */
  14: {message:"InvalidAuditPublicKey"}
}



export interface OutputNoteEventPayload {
  ciphertext: Buffer;
  ephemeral_x: Buffer;
  ephemeral_y: Buffer;
  output_index: u32;
  tag: Buffer;
}


export const Groth16Error = {
  0: {message:"MalformedVerifyingKey"}
}


/**
 * Plaintext note fields stored in registry for onboarding claim.
 */
export interface PlaintextNote {
  asset_hi: Buffer;
  asset_lo: Buffer;
  /**
 * Must remain `None`; registry rejects payloads that expose the sender ephemeral scalar.
 */
deposited_ephemeral_scalar: Option<Buffer>;
  nullifier: Buffer;
  secret: Buffer;
  value: i128;
}


export interface PendingNotePayload {
  notes: Array<PlaintextNote>;
}


export interface PrivateAddressRegistration {
  owner: string;
  public_key_x: Buffer;
  public_key_y: Buffer;
}

export type OptionalPrivateAddressRegistration = {tag: "None", values: void} | {tag: "Some", values: readonly [PrivateAddressRegistration]};


export interface OnboardingPayload {
  encrypted_private_key: Buffer;
  notes: PendingNotePayload;
  owner: string;
  private_address_registration: OptionalPrivateAddressRegistration;
  temp_public_key_x: Buffer;
  temp_public_key_y: Buffer;
}


export interface PrivateAddressRecord {
  owner: string;
  public_key_x: Buffer;
  public_key_y: Buffer;
  updated_at_ledger: u32;
}


export interface PendingNullifierRecord {
  created_at_ledger: u32;
  created_by: string;
  encrypted_private_key: Buffer;
  note: PlaintextNote;
  owner: string;
  temp_public_key_x: Buffer;
  temp_public_key_y: Buffer;
}


export interface KytPassageRecord {
  expires_at_ledger: u32;
}


export interface KytPassageAuthorization {
  expiration_ledger: u32;
  signature: Buffer;
}

export interface Client {
  /**
   * Construct and simulate a transact transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Single entrypoint: verifies `circuits/main.circom` Groth16 proof and public signals, checks
   * tree root and nullifiers, appends new output commitments (with ephemeral keys, not in Merkle),
   * optionally forwards onboarding payload to the registry, then applies public token deposits /
   * withdrawals: `publicDepositedAssets` + `publicDeposits` pull from `from`, and
   * `publicWithdrawnAssets` + `publicWithdrawals` send to the Stellar account from
   * `withdrawAddressHi` / `withdrawAddressLo`.
   * 
   * Asset ids: Stellar **contract** token `C...` addresses encoded as two field elements (same 32-byte
   * split as account keys — see `circuits/main.circom`).
   * 
   * Withdraw destination account: Stellar **account** Ed25519 key (G-address strkey payload) split into two
   * public field elements `withdrawAddressHi` / `withdrawAddressLo` — big-endian `u128` chunks
   * `bytes[0..16]` and `bytes[16..32]` (see `circuits/main.circom`). Avoids mod-`r` loss from a single `Fr`.
   */
  transact: ({from, proof_bytes, pub_signals_bytes, onboarding, kyt_authorization}: {from: string, proof_bytes: Buffer, pub_signals_bytes: Buffer, onboarding: Option<OnboardingPayload>, kyt_authorization: Option<KytPassageAuthorization>}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_kyt_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_kyt_registry: ({admin, kyt_registry}: {admin: string, kyt_registry: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_kyt_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_kyt_registry: (options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a require_kyt_passage transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  require_kyt_passage: ({passage_id}: {passage_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a set_app_audit_key transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_app_audit_key: ({admin, application_id, audit_public_key_x, audit_public_key_y, enabled}: {admin: string, application_id: Buffer, audit_public_key_x: Buffer, audit_public_key_y: Buffer, enabled: boolean}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_app_audit_state transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_app_audit_state: ({application_id}: {application_id: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<AppAuditState>>>

  /**
   * Construct and simulate a set_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_registry: ({admin, registry}: {admin: string, registry: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_registry transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_registry: (options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a get_merkle_root transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Gets the current merkle root of the commitment tree.
   */
  get_merkle_root: (options?: MethodOptions) => Promise<AssembledTransaction<Buffer>>

  /**
   * Construct and simulate a get_merkle_depth transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Gets the current depth of the merkle tree
   */
  get_merkle_depth: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_commitment_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Gets the number of commitments (leaves) in the merkle tree
   */
  get_commitment_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_leaf_ephemeral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Ephemeral key (x, y) for a leaf index, if present.
   */
  get_leaf_ephemeral: ({leaf_index}: {leaf_index: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Option<EphemeralKeyCoords>>>

  /**
   * Construct and simulate a get_pairwise_frontier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Filled-subtree frontier after the last pairwise insert (reload on the next deposit).
   */
  get_pairwise_frontier: (options?: MethodOptions) => Promise<AssembledTransaction<Array<Buffer>>>

  /**
   * Construct and simulate a get_commitments transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Gets all commitments (leaves) in the merkle tree
   */
  get_commitments: (options?: MethodOptions) => Promise<AssembledTransaction<Array<Buffer>>>

  /**
   * Construct and simulate a is_nulifier_hash_consumed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns true if the given nullifier hash has already been consumed (used in a withdrawal).
   */
  is_nulifier_hash_consumed: ({hash}: {hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a is_known_root transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Returns true if `root` appears in the recent root history (ring buffer).
   * All-zero bytes are never accepted.
   */
  is_known_root: ({root}: {root: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a get_token_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Token balance held by this contract for a Stellar asset contract (`C...`).
   */
  get_token_balance: ({token}: {token: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_public_slot_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * `publicNInputs` / `publicNOutputs` configured at deploy (must match the verification key circuit).
   */
  get_public_slot_config: (options?: MethodOptions) => Promise<AssembledTransaction<readonly [u32, u32]>>

  /**
   * Construct and simulate a get_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Gets the admin address (the contract deployer)
   */
  get_admin: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {tree_depth, vk_bytes, public_n_inputs, public_n_outputs, admin}: {tree_depth: u32, vk_bytes: Buffer, public_n_inputs: u32, public_n_outputs: u32, admin: string},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({tree_depth, vk_bytes, public_n_inputs, public_n_outputs, admin}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAEhQZXItYXBwbGljYXRpb24gYXVkaXQgcHVibGljIGtleSBhbGxvd2xpc3QgZW50cnkgKHJ1bnRpbWUvY29uZmlnIHN0YXRlKS4AAAAAAAAADUFwcEF1ZGl0U3RhdGUAAAAAAAADAAAAAAAAABJhdWRpdF9wdWJsaWNfa2V5X3gAAAAAA+4AAAAgAAAAAAAAABJhdWRpdF9wdWJsaWNfa2V5X3kAAAAAA+4AAAAgAAAAAAAAAAdlbmFibGVkAAAAAAE=",
        "AAAAAQAAAERFcGhlbWVyYWwgQmFieUp1Ykp1YiAvIEVDREggcG9pbnQgKG5vdCBoYXNoZWQgaW50byB0aGUgTWVya2xlIHRyZWUpLgAAAAAAAAASRXBoZW1lcmFsS2V5Q29vcmRzAAAAAAACAAAAAAAAAAF4AAAAAAAD7gAAACAAAAAAAAAAAXkAAAAAAAPuAAAAIA==",
        "AAAAAgAAAFRTdG9yYWdlIGtleSBmb3IgdHJlZSBsZWF2ZXMg4oCUIGVhY2ggbGVhZiBzdG9yZWQgYnkgaW5kZXggZm9yIE8oMSkgd3JpdGUgb24gZGVwb3NpdC4AAAAAAAAAC1RyZWVEYXRhS2V5AAAAAAQAAAABAAAAAAAAAARMZWFmAAAAAQAAAAQAAAAAAAAAAAAAAAlMZWFmQ291bnQAAAAAAAABAAAAVEVwaGVtZXJhbCBwdWJsaWMga2V5IChFQ0RIIHBvaW50IHgsIHkpIHN0b3JlZCBwZXIgbGVhZjsgbm90IHBhcnQgb2YgdGhlIE1lcmtsZSBoYXNoLgAAAA1MZWFmRXBoZW1lcmFsAAAAAAAAAQAAAAQAAAAAAAAAXlJpZ2h0LXNwaW5lIC8gZmlsbGVkLXN1YnRyZWUgZnJvbnRpZXIgYWZ0ZXIgdGhlIGxhc3QgYGluc2VydF90d29gIChsZW5ndGggYG1lcmtsZV9kZXB0aCAtIDFgKS4AAAAAABBQYWlyd2lzZUZyb250aWVy",
        "AAAAAgAAAFJTdG9yYWdlIGtleSBmb3IgbnVsbGlmaWVycyDigJQgZWFjaCBudWxsaWZpZXIgaGFzaCBtYXBzIHRvIGJvb2wgKGNvbnN1bWVkIG9yIG5vdCkuAAAAAAAAAAAAD051bGlmaWVyRGF0YUtleQAAAAABAAAAAQAAAAAAAAAITnVsaWZpZXIAAAABAAAD7gAAACA=",
        "AAAAAgAAAFRSaW5nIGJ1ZmZlciBvZiBoaXN0b3JpY2FsIE1lcmtsZSByb290cyAoZm9yIHByb29mcyBnZW5lcmF0ZWQgYWdhaW5zdCByZWNlbnQgc3RhdGVzKS4AAAAAAAAADlJvb3RIaXN0b3J5S2V5AAAAAAACAAAAAAAAACpOZXdlc3Qgcm9vdCBzbG90IGluZGV4IGluIHRoZSByaW5nIGJ1ZmZlci4AAAAAABBDdXJyZW50Um9vdEluZGV4AAAAAQAAAC5Sb290IHZhbHVlIGF0IHNsb3QgYGlgICgwLi5ST09UX0hJU1RPUllfU0laRSkuAAAAAAAEUm9vdAAAAAEAAAAE",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAADgAAAAAAAAANTnVsbGlmaWVyVXNlZAAAAAAAAAEAAAAAAAAAE0luc3VmZmljaWVudEJhbGFuY2UAAAAAAgAAAAAAAAAXUHJvb2ZWZXJpZmljYXRpb25GYWlsZWQAAAAAAwAAAAAAAAAJT25seUFkbWluAAAAAAAABAAAAAAAAAAOVHJlZUF0Q2FwYWNpdHkAAAAAAAUAAAAAAAAAF0Fzc29jaWF0aW9uUm9vdE1pc21hdGNoAAAAAAYAAAAAAAAAFEludmFsaWRQdWJsaWNTaWduYWxzAAAABwAAAAAAAAASSW52YWxpZFRva2VuQW1vdW50AAAAAAAIAAAAPFByb29mIGBzdGF0ZV9yb290YCBpcyBub3QgaW4gdGhlIHJlY2VudCByb290IGhpc3Rvcnkgd2luZG93LgAAAAtVbmtub3duUm9vdAAAAAAJAAAAXkV4YWN0bHkgb25lIG91dHB1dCBjb21taXRtZW50IGlzIG5vbi16ZXJvOyBvbmx5IHplcm8vemVybyBvciB0d28gbm9uLXplcm8gb3V0cHV0cyBhcmUgYWxsb3dlZC4AAAAAABVJbnZhbGlkQ29tbWl0bWVudFBhaXIAAAAAAAAKAAAAXVN0b3JlZCBNZXJrbGUgZnJvbnRpZXIgbGVuZ3RoIGRvZXMgbm90IG1hdGNoIHRyZWUgZGVwdGggKGNvcnJ1cHQgb3Igb3V0ZGF0ZWQgc3RvcmFnZSBsYXlvdXQpLgAAAAAAABVJbnZhbGlkTWVya2xlRnJvbnRpZXIAAAAAAAALAAAASUtZVCBwYXNzYWdlIHJlZ2lzdHJ5IGlzIG5vdCBjb25maWd1cmVkIChyZXF1aXJlZCBmb3IgdGhlIGN1cnJlbnQgbGF5b3V0KS4AAAAAAAASS3l0UmVnaXN0cnlNaXNzaW5nAAAAAAAMAAAARFB1YmxpYyBub3RlIGF1ZGl0IGtleSBpcyBub3QgcmVnaXN0ZXJlZCBmb3IgYW55IGVuYWJsZWQgYXBwbGljYXRpb24uAAAAFVVua25vd25BdWRpdFB1YmxpY0tleQAAAAAAAA0AAABDUHVibGljIG5vdGUgYXVkaXQga2V5IGNvb3JkaW5hdGVzIGFyZSBub3QgYSB2YWxpZCBCYWJ5SnViSnViIHBvaW50LgAAAAAVSW52YWxpZEF1ZGl0UHVibGljS2V5AAAAAAAADg==",
        "AAAABQAAAAAAAAAAAAAAEkt5dFBhc3NhZ2VUcmFuc2FjdAAAAAAAAgAAAAVhdWRpdAAAAAAAAAtreXRfcGFzc2FnZQAAAAACAAAAAAAAAApwYXNzYWdlX2lkAAAAAAPuAAAAIAAAAAEAAAAAAAAAEnB1YmxpY19zaWduYWxfaGFzaAAAAAAD7gAAACAAAAAAAAAAAA==",
        "AAAAAQAAAAAAAAAAAAAAFk91dHB1dE5vdGVFdmVudFBheWxvYWQAAAAAAAUAAAAAAAAACmNpcGhlcnRleHQAAAAAAA4AAAAAAAAAC2VwaGVtZXJhbF94AAAAA+4AAAAgAAAAAAAAAAtlcGhlbWVyYWxfeQAAAAPuAAAAIAAAAAAAAAAMb3V0cHV0X2luZGV4AAAABAAAAAAAAAADdGFnAAAAA+4AAAAg",
        "AAAABQAAAAAAAAAAAAAAE091dHB1dE5vdGVFbmNyeXB0ZWQAAAAAAgAAAAVhdWRpdAAAAAAAAAtvdXRwdXRfbm90ZQAAAAACAAAAAAAAAA9jb21taXRtZW50X2hhc2gAAAAD7gAAACAAAAABAAAAAAAAAAdwYXlsb2FkAAAAB9AAAAAWT3V0cHV0Tm90ZUV2ZW50UGF5bG9hZAAAAAAAAAAAAAA=",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAUAAAAAAAAACnRyZWVfZGVwdGgAAAAAAAQAAAAAAAAACHZrX2J5dGVzAAAADgAAAAAAAAAPcHVibGljX25faW5wdXRzAAAAAAQAAAAAAAAAEHB1YmxpY19uX291dHB1dHMAAAAEAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAA",
        "AAAAAAAAA6lTaW5nbGUgZW50cnlwb2ludDogdmVyaWZpZXMgYGNpcmN1aXRzL21haW4uY2lyY29tYCBHcm90aDE2IHByb29mIGFuZCBwdWJsaWMgc2lnbmFscywgY2hlY2tzCnRyZWUgcm9vdCBhbmQgbnVsbGlmaWVycywgYXBwZW5kcyBuZXcgb3V0cHV0IGNvbW1pdG1lbnRzICh3aXRoIGVwaGVtZXJhbCBrZXlzLCBub3QgaW4gTWVya2xlKSwKb3B0aW9uYWxseSBmb3J3YXJkcyBvbmJvYXJkaW5nIHBheWxvYWQgdG8gdGhlIHJlZ2lzdHJ5LCB0aGVuIGFwcGxpZXMgcHVibGljIHRva2VuIGRlcG9zaXRzIC8Kd2l0aGRyYXdhbHM6IGBwdWJsaWNEZXBvc2l0ZWRBc3NldHNgICsgYHB1YmxpY0RlcG9zaXRzYCBwdWxsIGZyb20gYGZyb21gLCBhbmQKYHB1YmxpY1dpdGhkcmF3bkFzc2V0c2AgKyBgcHVibGljV2l0aGRyYXdhbHNgIHNlbmQgdG8gdGhlIFN0ZWxsYXIgYWNjb3VudCBmcm9tCmB3aXRoZHJhd0FkZHJlc3NIaWAgLyBgd2l0aGRyYXdBZGRyZXNzTG9gLgoKQXNzZXQgaWRzOiBTdGVsbGFyICoqY29udHJhY3QqKiB0b2tlbiBgQy4uLmAgYWRkcmVzc2VzIGVuY29kZWQgYXMgdHdvIGZpZWxkIGVsZW1lbnRzIChzYW1lIDMyLWJ5dGUKc3BsaXQgYXMgYWNjb3VudCBrZXlzIOKAlCBzZWUgYGNpcmN1aXRzL21haW4uY2lyY29tYCkuCgpXaXRoZHJhdyBkZXN0aW5hdGlvbiBhY2NvdW50OiBTdGVsbGFyICoqYWNjb3VudCoqIEVkMjU1MTkga2V5IChHLWFkZHJlc3Mgc3Rya2V5IHBheWxvYWQpIHNwbGl0IGludG8gdHdvCnB1YmxpYyBmaWVsZCBlbGVtZW50cyBgd2l0aGRyYXdBZGRyZXNzSGlgIC8gYHdpdGhkcmF3QWRkcmVzc0xvYCDigJQgYmlnLWVuZGlhbiBgdTEyOGAgY2h1bmtzCmBieXRlc1swLi4xNl1gIGFuZCBgYnl0ZXNbMTYuLjMyXWAgKHNlZSBgY2lyY3VpdHMvbWFpbi5jaXJjb21gKS4gQXZvaWRzIG1vZC1gcmAgbG9zcyBmcm9tIGEgc2luZ2xlIGBGcmAuAAAAAAAACHRyYW5zYWN0AAAABQAAAAAAAAAEZnJvbQAAABMAAAAAAAAAC3Byb29mX2J5dGVzAAAAAA4AAAAAAAAAEXB1Yl9zaWduYWxzX2J5dGVzAAAAAAAADgAAAAAAAAAKb25ib2FyZGluZwAAAAAD6AAAB9AAAAART25ib2FyZGluZ1BheWxvYWQAAAAAAAAAAAAAEWt5dF9hdXRob3JpemF0aW9uAAAAAAAD6AAAB9AAAAAXS3l0UGFzc2FnZUF1dGhvcml6YXRpb24AAAAAAQAAA+kAAAACAAAAAw==",
        "AAAAAAAAAAAAAAAQc2V0X2t5dF9yZWdpc3RyeQAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMa3l0X3JlZ2lzdHJ5AAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAQZ2V0X2t5dF9yZWdpc3RyeQAAAAAAAAABAAAD6AAAABM=",
        "AAAAAAAAAAAAAAATcmVxdWlyZV9reXRfcGFzc2FnZQAAAAABAAAAAAAAAApwYXNzYWdlX2lkAAAAAAPuAAAAIAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAAAAAAARc2V0X2FwcF9hdWRpdF9rZXkAAAAAAAAFAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADmFwcGxpY2F0aW9uX2lkAAAAAAPuAAAAIAAAAAAAAAASYXVkaXRfcHVibGljX2tleV94AAAAAAPuAAAAIAAAAAAAAAASYXVkaXRfcHVibGljX2tleV95AAAAAAPuAAAAIAAAAAAAAAAHZW5hYmxlZAAAAAABAAAAAA==",
        "AAAAAAAAAAAAAAATZ2V0X2FwcF9hdWRpdF9zdGF0ZQAAAAABAAAAAAAAAA5hcHBsaWNhdGlvbl9pZAAAAAAD7gAAACAAAAABAAAD6AAAB9AAAAANQXBwQXVkaXRTdGF0ZQAAAA==",
        "AAAAAAAAAAAAAAAMc2V0X3JlZ2lzdHJ5AAAAAgAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhyZWdpc3RyeQAAABMAAAAA",
        "AAAAAAAAAAAAAAAMZ2V0X3JlZ2lzdHJ5AAAAAAAAAAEAAAPoAAAAEw==",
        "AAAAAAAAADRHZXRzIHRoZSBjdXJyZW50IG1lcmtsZSByb290IG9mIHRoZSBjb21taXRtZW50IHRyZWUuAAAAD2dldF9tZXJrbGVfcm9vdAAAAAAAAAAAAQAAA+4AAAAg",
        "AAAAAAAAAClHZXRzIHRoZSBjdXJyZW50IGRlcHRoIG9mIHRoZSBtZXJrbGUgdHJlZQAAAAAAABBnZXRfbWVya2xlX2RlcHRoAAAAAAAAAAEAAAAE",
        "AAAAAAAAADpHZXRzIHRoZSBudW1iZXIgb2YgY29tbWl0bWVudHMgKGxlYXZlcykgaW4gdGhlIG1lcmtsZSB0cmVlAAAAAAAUZ2V0X2NvbW1pdG1lbnRfY291bnQAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAADJFcGhlbWVyYWwga2V5ICh4LCB5KSBmb3IgYSBsZWFmIGluZGV4LCBpZiBwcmVzZW50LgAAAAAAEmdldF9sZWFmX2VwaGVtZXJhbAAAAAAAAQAAAAAAAAAKbGVhZl9pbmRleAAAAAAABAAAAAEAAAPoAAAH0AAAABJFcGhlbWVyYWxLZXlDb29yZHMAAA==",
        "AAAAAAAAAFRGaWxsZWQtc3VidHJlZSBmcm9udGllciBhZnRlciB0aGUgbGFzdCBwYWlyd2lzZSBpbnNlcnQgKHJlbG9hZCBvbiB0aGUgbmV4dCBkZXBvc2l0KS4AAAAVZ2V0X3BhaXJ3aXNlX2Zyb250aWVyAAAAAAAAAAAAAAEAAAPqAAAD7gAAACA=",
        "AAAAAAAAADBHZXRzIGFsbCBjb21taXRtZW50cyAobGVhdmVzKSBpbiB0aGUgbWVya2xlIHRyZWUAAAAPZ2V0X2NvbW1pdG1lbnRzAAAAAAAAAAABAAAD6gAAA+4AAAAg",
        "AAAAAAAAAFpSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG51bGxpZmllciBoYXNoIGhhcyBhbHJlYWR5IGJlZW4gY29uc3VtZWQgKHVzZWQgaW4gYSB3aXRoZHJhd2FsKS4AAAAAABlpc19udWxpZmllcl9oYXNoX2NvbnN1bWVkAAAAAAAAAQAAAAAAAAAEaGFzaAAAA+4AAAAgAAAAAQAAAAE=",
        "AAAAAAAAAGtSZXR1cm5zIHRydWUgaWYgYHJvb3RgIGFwcGVhcnMgaW4gdGhlIHJlY2VudCByb290IGhpc3RvcnkgKHJpbmcgYnVmZmVyKS4KQWxsLXplcm8gYnl0ZXMgYXJlIG5ldmVyIGFjY2VwdGVkLgAAAAANaXNfa25vd25fcm9vdAAAAAAAAAEAAAAAAAAABHJvb3QAAAPuAAAAIAAAAAEAAAAB",
        "AAAAAAAAAEpUb2tlbiBiYWxhbmNlIGhlbGQgYnkgdGhpcyBjb250cmFjdCBmb3IgYSBTdGVsbGFyIGFzc2V0IGNvbnRyYWN0IChgQy4uLmApLgAAAAAAEWdldF90b2tlbl9iYWxhbmNlAAAAAAAAAQAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAQAAAAs=",
        "AAAAAAAAAGJgcHVibGljTklucHV0c2AgLyBgcHVibGljTk91dHB1dHNgIGNvbmZpZ3VyZWQgYXQgZGVwbG95IChtdXN0IG1hdGNoIHRoZSB2ZXJpZmljYXRpb24ga2V5IGNpcmN1aXQpLgAAAAAAFmdldF9wdWJsaWNfc2xvdF9jb25maWcAAAAAAAAAAAABAAAD7QAAAAIAAAAEAAAABA==",
        "AAAAAAAAAC5HZXRzIHRoZSBhZG1pbiBhZGRyZXNzICh0aGUgY29udHJhY3QgZGVwbG95ZXIpAAAAAAAJZ2V0X2FkbWluAAAAAAAAAAAAAAEAAAAT",
        "AAAABAAAAAAAAAAAAAAADEdyb3RoMTZFcnJvcgAAAAEAAAAAAAAAFU1hbGZvcm1lZFZlcmlmeWluZ0tleQAAAAAAAAA=",
        "AAAAAQAAAD5QbGFpbnRleHQgbm90ZSBmaWVsZHMgc3RvcmVkIGluIHJlZ2lzdHJ5IGZvciBvbmJvYXJkaW5nIGNsYWltLgAAAAAAAAAAAA1QbGFpbnRleHROb3RlAAAAAAAABgAAAAAAAAAIYXNzZXRfaGkAAAPuAAAAIAAAAAAAAAAIYXNzZXRfbG8AAAPuAAAAIAAAAFZNdXN0IHJlbWFpbiBgTm9uZWA7IHJlZ2lzdHJ5IHJlamVjdHMgcGF5bG9hZHMgdGhhdCBleHBvc2UgdGhlIHNlbmRlciBlcGhlbWVyYWwgc2NhbGFyLgAAAAAAGmRlcG9zaXRlZF9lcGhlbWVyYWxfc2NhbGFyAAAAAAPoAAAD7gAAACAAAAAAAAAACW51bGxpZmllcgAAAAAAA+4AAAAgAAAAAAAAAAZzZWNyZXQAAAAAA+4AAAAgAAAAAAAAAAV2YWx1ZQAAAAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAAElBlbmRpbmdOb3RlUGF5bG9hZAAAAAAAAQAAAAAAAAAFbm90ZXMAAAAAAAPqAAAH0AAAAA1QbGFpbnRleHROb3RlAAAA",
        "AAAAAQAAAAAAAAAAAAAAGlByaXZhdGVBZGRyZXNzUmVnaXN0cmF0aW9uAAAAAAADAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAADHB1YmxpY19rZXlfeAAAA+4AAAAgAAAAAAAAAAxwdWJsaWNfa2V5X3kAAAPuAAAAIA==",
        "AAAAAgAAAAAAAAAAAAAAIk9wdGlvbmFsUHJpdmF0ZUFkZHJlc3NSZWdpc3RyYXRpb24AAAAAAAIAAAAAAAAAAAAAAAROb25lAAAAAQAAAAAAAAAEU29tZQAAAAEAAAfQAAAAGlByaXZhdGVBZGRyZXNzUmVnaXN0cmF0aW9uAAA=",
        "AAAAAQAAAAAAAAAAAAAAEU9uYm9hcmRpbmdQYXlsb2FkAAAAAAAABgAAAAAAAAAVZW5jcnlwdGVkX3ByaXZhdGVfa2V5AAAAAAAADgAAAAAAAAAFbm90ZXMAAAAAAAfQAAAAElBlbmRpbmdOb3RlUGF5bG9hZAAAAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAAHHByaXZhdGVfYWRkcmVzc19yZWdpc3RyYXRpb24AAAfQAAAAIk9wdGlvbmFsUHJpdmF0ZUFkZHJlc3NSZWdpc3RyYXRpb24AAAAAAAAAAAARdGVtcF9wdWJsaWNfa2V5X3gAAAAAAAPuAAAAIAAAAAAAAAARdGVtcF9wdWJsaWNfa2V5X3kAAAAAAAPuAAAAIA==",
        "AAAAAQAAAAAAAAAAAAAAFFByaXZhdGVBZGRyZXNzUmVjb3JkAAAABAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAAAxwdWJsaWNfa2V5X3gAAAPuAAAAIAAAAAAAAAAMcHVibGljX2tleV95AAAD7gAAACAAAAAAAAAAEXVwZGF0ZWRfYXRfbGVkZ2VyAAAAAAAABA==",
        "AAAAAQAAAAAAAAAAAAAAFlBlbmRpbmdOdWxsaWZpZXJSZWNvcmQAAAAAAAcAAAAAAAAAEWNyZWF0ZWRfYXRfbGVkZ2VyAAAAAAAABAAAAAAAAAAKY3JlYXRlZF9ieQAAAAAAEwAAAAAAAAAVZW5jcnlwdGVkX3ByaXZhdGVfa2V5AAAAAAAADgAAAAAAAAAEbm90ZQAAB9AAAAANUGxhaW50ZXh0Tm90ZQAAAAAAAAAAAAAFb3duZXIAAAAAAAATAAAAAAAAABF0ZW1wX3B1YmxpY19rZXlfeAAAAAAAA+4AAAAgAAAAAAAAABF0ZW1wX3B1YmxpY19rZXlfeQAAAAAAA+4AAAAg",
        "AAAAAQAAAAAAAAAAAAAAEEt5dFBhc3NhZ2VSZWNvcmQAAAABAAAAAAAAABFleHBpcmVzX2F0X2xlZGdlcgAAAAAAAAQ=",
        "AAAAAQAAAAAAAAAAAAAAF0t5dFBhc3NhZ2VBdXRob3JpemF0aW9uAAAAAAIAAAAAAAAAEWV4cGlyYXRpb25fbGVkZ2VyAAAAAAAABAAAAAAAAAAJc2lnbmF0dXJlAAAAAAAD7gAAAEA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    transact: this.txFromJSON<Result<void>>,
        set_kyt_registry: this.txFromJSON<null>,
        get_kyt_registry: this.txFromJSON<Option<string>>,
        require_kyt_passage: this.txFromJSON<Result<void>>,
        set_app_audit_key: this.txFromJSON<null>,
        get_app_audit_state: this.txFromJSON<Option<AppAuditState>>,
        set_registry: this.txFromJSON<null>,
        get_registry: this.txFromJSON<Option<string>>,
        get_merkle_root: this.txFromJSON<Buffer>,
        get_merkle_depth: this.txFromJSON<u32>,
        get_commitment_count: this.txFromJSON<u32>,
        get_leaf_ephemeral: this.txFromJSON<Option<EphemeralKeyCoords>>,
        get_pairwise_frontier: this.txFromJSON<Array<Buffer>>,
        get_commitments: this.txFromJSON<Array<Buffer>>,
        is_nulifier_hash_consumed: this.txFromJSON<boolean>,
        is_known_root: this.txFromJSON<boolean>,
        get_token_balance: this.txFromJSON<i128>,
        get_public_slot_config: this.txFromJSON<readonly [u32, u32]>,
        get_admin: this.txFromJSON<string>
  }
}