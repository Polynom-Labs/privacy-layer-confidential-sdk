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
    contractId: "CCO5QRTS5HFVPR356FFC4NI62IMBQNDGMOAXR4K5UVTV3YMRWDZGKXGC",
  }
} as const

export const Errors = {
  1: {message:"OnlyAdmin"},
  2: {message:"UntrustedCaller"},
  3: {message:"DuplicatePendingNullifier"},
  4: {message:"ForbiddenEphemeralScalar"},
  5: {message:"EmptyNotes"}
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
   * Construct and simulate a set_trusted_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  set_trusted_pool: ({admin, trusted_pool}: {admin: string, trusted_pool: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_trusted_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_trusted_pool: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a register_private_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Owner registers a permanent private address directly.
   */
  register_private_address: ({owner, public_key_x, public_key_y}: {owner: string, public_key_x: Buffer, public_key_y: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a register_address_via_pool transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Trusted pool forwards registration after owner auth in the same transaction.
   */
  register_address_via_pool: ({registration}: {registration: PrivateAddressRegistration}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_private_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_private_address: ({owner}: {owner: string}, options?: MethodOptions) => Promise<AssembledTransaction<Option<PrivateAddressRecord>>>

  /**
   * Construct and simulate a get_owner_by_public_key transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Resolve the Stellar G-address owner from a registered private-address public key.
   */
  get_owner_by_public_key: ({public_key_x, public_key_y}: {public_key_x: Buffer, public_key_y: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a seed_private_address transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Admin-only migration helper: seed forward and reverse indexes without owner auth.
   */
  seed_private_address: ({admin, registration, updated_at_ledger}: {admin: string, registration: PrivateAddressRegistration, updated_at_ledger: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a register_pending_notes transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Trusted pool registers onboarding pending notes.
   */
  register_pending_notes: ({sender, payload}: {sender: string, payload: OnboardingPayload}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a auth_address_for_nullifier transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  auth_address_for_nullifier: ({nullifier_hash}: {nullifier_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a get_pending_nullifier_record transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_pending_nullifier_record: ({nullifier_hash}: {nullifier_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Option<PendingNullifierRecord>>>

  /**
   * Construct and simulate a future_nullifier_hash transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  future_nullifier_hash: ({note}: {note: PlaintextNote}, options?: MethodOptions) => Promise<AssembledTransaction<Buffer>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, trusted_pool}: {admin: string, trusted_pool: string},
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
    return ContractClient.deploy({admin, trusted_pool}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAABQAAAAAAAAAJT25seUFkbWluAAAAAAAAAQAAAAAAAAAPVW50cnVzdGVkQ2FsbGVyAAAAAAIAAAAAAAAAGUR1cGxpY2F0ZVBlbmRpbmdOdWxsaWZpZXIAAAAAAAADAAAAAAAAABhGb3JiaWRkZW5FcGhlbWVyYWxTY2FsYXIAAAAEAAAAAAAAAApFbXB0eU5vdGVzAAAAAAAF",
        "AAAAAAAAAAAAAAANX19jb25zdHJ1Y3RvcgAAAAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMdHJ1c3RlZF9wb29sAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAQc2V0X3RydXN0ZWRfcG9vbAAAAAIAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAMdHJ1c3RlZF9wb29sAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAQZ2V0X3RydXN0ZWRfcG9vbAAAAAAAAAABAAAAEw==",
        "AAAAAAAAADVPd25lciByZWdpc3RlcnMgYSBwZXJtYW5lbnQgcHJpdmF0ZSBhZGRyZXNzIGRpcmVjdGx5LgAAAAAAABhyZWdpc3Rlcl9wcml2YXRlX2FkZHJlc3MAAAADAAAAAAAAAAVvd25lcgAAAAAAABMAAAAAAAAADHB1YmxpY19rZXlfeAAAA+4AAAAgAAAAAAAAAAxwdWJsaWNfa2V5X3kAAAPuAAAAIAAAAAA=",
        "AAAAAAAAAExUcnVzdGVkIHBvb2wgZm9yd2FyZHMgcmVnaXN0cmF0aW9uIGFmdGVyIG93bmVyIGF1dGggaW4gdGhlIHNhbWUgdHJhbnNhY3Rpb24uAAAAGXJlZ2lzdGVyX2FkZHJlc3NfdmlhX3Bvb2wAAAAAAAABAAAAAAAAAAxyZWdpc3RyYXRpb24AAAfQAAAAGlByaXZhdGVBZGRyZXNzUmVnaXN0cmF0aW9uAAAAAAAA",
        "AAAAAAAAAAAAAAATZ2V0X3ByaXZhdGVfYWRkcmVzcwAAAAABAAAAAAAAAAVvd25lcgAAAAAAABMAAAABAAAD6AAAB9AAAAAUUHJpdmF0ZUFkZHJlc3NSZWNvcmQ=",
        "AAAAAAAAAFFSZXNvbHZlIHRoZSBTdGVsbGFyIEctYWRkcmVzcyBvd25lciBmcm9tIGEgcmVnaXN0ZXJlZCBwcml2YXRlLWFkZHJlc3MgcHVibGljIGtleS4AAAAAAAAXZ2V0X293bmVyX2J5X3B1YmxpY19rZXkAAAAAAgAAAAAAAAAMcHVibGljX2tleV94AAAD7gAAACAAAAAAAAAADHB1YmxpY19rZXlfeQAAA+4AAAAgAAAAAQAAA+gAAAAT",
        "AAAAAAAAAFFBZG1pbi1vbmx5IG1pZ3JhdGlvbiBoZWxwZXI6IHNlZWQgZm9yd2FyZCBhbmQgcmV2ZXJzZSBpbmRleGVzIHdpdGhvdXQgb3duZXIgYXV0aC4AAAAAAAAUc2VlZF9wcml2YXRlX2FkZHJlc3MAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAADHJlZ2lzdHJhdGlvbgAAB9AAAAAaUHJpdmF0ZUFkZHJlc3NSZWdpc3RyYXRpb24AAAAAAAAAAAARdXBkYXRlZF9hdF9sZWRnZXIAAAAAAAAEAAAAAA==",
        "AAAAAAAAADBUcnVzdGVkIHBvb2wgcmVnaXN0ZXJzIG9uYm9hcmRpbmcgcGVuZGluZyBub3Rlcy4AAAAWcmVnaXN0ZXJfcGVuZGluZ19ub3RlcwAAAAAAAgAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAAAAAAdwYXlsb2FkAAAAB9AAAAART25ib2FyZGluZ1BheWxvYWQAAAAAAAAA",
        "AAAAAAAAAAAAAAAaYXV0aF9hZGRyZXNzX2Zvcl9udWxsaWZpZXIAAAAAAAEAAAAAAAAADm51bGxpZmllcl9oYXNoAAAAAAPuAAAAIAAAAAEAAAPoAAAAEw==",
        "AAAAAAAAAAAAAAAcZ2V0X3BlbmRpbmdfbnVsbGlmaWVyX3JlY29yZAAAAAEAAAAAAAAADm51bGxpZmllcl9oYXNoAAAAAAPuAAAAIAAAAAEAAAPoAAAH0AAAABZQZW5kaW5nTnVsbGlmaWVyUmVjb3JkAAA=",
        "AAAAAAAAAAAAAAAVZnV0dXJlX251bGxpZmllcl9oYXNoAAAAAAAAAQAAAAAAAAAEbm90ZQAAB9AAAAANUGxhaW50ZXh0Tm90ZQAAAAAAAAEAAAPuAAAAIA==",
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
    set_trusted_pool: this.txFromJSON<null>,
        get_trusted_pool: this.txFromJSON<string>,
        register_private_address: this.txFromJSON<null>,
        register_address_via_pool: this.txFromJSON<null>,
        get_private_address: this.txFromJSON<Option<PrivateAddressRecord>>,
        get_owner_by_public_key: this.txFromJSON<Option<string>>,
        seed_private_address: this.txFromJSON<null>,
        register_pending_notes: this.txFromJSON<null>,
        auth_address_for_nullifier: this.txFromJSON<Option<string>>,
        get_pending_nullifier_record: this.txFromJSON<Option<PendingNullifierRecord>>,
        future_nullifier_hash: this.txFromJSON<Buffer>
  }
}