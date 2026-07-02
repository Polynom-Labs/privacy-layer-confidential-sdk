import type { DepositIntent, TransferIntent, WithdrawIntent } from './intents.js';
import type { OperationResult } from './operations.js';

export abstract class PrivacyClient<TAddress, TAsset, TAmount, TPrepared, TReceipt> {
  abstract deposit(
    intent: DepositIntent<TAddress, TAsset, TAmount>,
  ): Promise<
    OperationResult<'deposit', TAddress, TAsset, TAmount, TPrepared, TReceipt>
  >;

  abstract transfer(
    intent: TransferIntent<TAddress, TAsset, TAmount>,
  ): Promise<
    OperationResult<'transfer', TAddress, TAsset, TAmount, TPrepared, TReceipt>
  >;

  abstract withdraw(
    intent: WithdrawIntent<TAddress, TAsset, TAmount>,
  ): Promise<
    OperationResult<'withdraw', TAddress, TAsset, TAmount, TPrepared, TReceipt>
  >;
}
