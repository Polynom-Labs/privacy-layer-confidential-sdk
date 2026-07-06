import type {
  StellarAddress,
  StellarAssetId,
  StellarPublicBalance,
} from '../../../types.js';
import {
  normalizePublicBalance,
  normalizePublicBalancesFromEntries,
} from '../../read/normalize.js';
import {
  stellarStateCallTypes,
  type StellarPublicBalanceInput,
} from '../../bridge/call-types.js';
import type { StellarStateServiceBase } from '../base.js';

export function createPublicBalanceMethods(context: StellarStateServiceBase) {
  const { bridge } = context;

  return {
    async getPublicBalance(input: {
      owner: StellarAddress;
      asset: StellarAssetId;
    }): Promise<StellarPublicBalance | undefined> {
      const value = await bridge.read<unknown>({
        type: stellarStateCallTypes.readPublicBalance,
        owner: input.owner,
        asset: input.asset,
      });
      return normalizePublicBalance(value);
    },

    async getPublicBalances(owner: StellarAddress): Promise<StellarPublicBalance[]> {
      const entries = await bridge.read<unknown>({
        type: stellarStateCallTypes.readPublicBalances,
        owner,
      });
      return normalizePublicBalancesFromEntries(entries, owner);
    },

    setPublicBalance(balance: StellarPublicBalanceInput): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.setPublicBalance,
        balance,
      });
    },

    setPublicBalances(input: {
      owner: StellarAddress;
      balances: StellarPublicBalanceInput[];
    }): Promise<void> {
      return bridge.write({
        type: stellarStateCallTypes.setPublicBalances,
        owner: input.owner,
        balances: input.balances,
      });
    },
  };
}
