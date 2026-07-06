import type { StellarStateService } from '../../state/index.js';

export function createPoolStateDelegates(state: StellarStateService) {
  return {
    getPoolMerkleState: (
      poolContract: Parameters<StellarStateService['getPoolMerkleState']>[0],
    ) => state.getPoolMerkleState(poolContract),
    setPoolMerkleState: (
      poolState: Parameters<StellarStateService['setPoolMerkleState']>[0],
    ) => state.setPoolMerkleState(poolState),
    appendPoolCommitments: (
      input: Parameters<StellarStateService['appendPoolCommitments']>[0],
    ) => state.appendPoolCommitments(input),
    getLeafEphemeral: (input: Parameters<StellarStateService['getLeafEphemeral']>[0]) =>
      state.getLeafEphemeral(input),
    setLeafEphemeral: (
      ephemeral: Parameters<StellarStateService['setLeafEphemeral']>[0],
    ) => state.setLeafEphemeral(ephemeral),
  };
}
