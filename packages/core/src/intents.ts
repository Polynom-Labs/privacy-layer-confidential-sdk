import type { DisclosurePolicy } from './disclosure.js';

export type OperationKind = 'deposit' | 'transfer' | 'withdraw';

export interface DepositIntent<TAddress, TAsset, TAmount> {
  from: TAddress;
  to: TAddress;
  asset: TAsset;
  amount: TAmount;
  disclosure: DisclosurePolicy;
}

export interface TransferIntent<TAddress, TAsset, TAmount> {
  from: TAddress;
  to: TAddress;
  asset: TAsset;
  amount: TAmount;
  disclosure: DisclosurePolicy;
}

export interface WithdrawIntent<TAddress, TAsset, TAmount> {
  from: TAddress;
  to: TAddress;
  asset: TAsset;
  amount: TAmount;
  disclosure: DisclosurePolicy;
}

export type OperationIntent<TAddress, TAsset, TAmount> =
  | DepositIntent<TAddress, TAsset, TAmount>
  | TransferIntent<TAddress, TAsset, TAmount>
  | WithdrawIntent<TAddress, TAsset, TAmount>;

export type IntentForKind<
  TKind extends OperationKind,
  TAddress,
  TAsset,
  TAmount,
> = TKind extends 'deposit'
  ? DepositIntent<TAddress, TAsset, TAmount>
  : TKind extends 'transfer'
    ? TransferIntent<TAddress, TAsset, TAmount>
    : WithdrawIntent<TAddress, TAsset, TAmount>;
