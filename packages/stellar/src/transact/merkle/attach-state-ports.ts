import type { StateBridgeAdapter } from '@arcane/privacy-sdk-core/state';
import { createStellarStateService } from '../../state/index.js';
import type {
  LeafEphemeralStatePort,
  PoolMerkleStatePort,
} from '../merkle/state-port.js';
import type { StellarTransactEnvironment } from '../environment/types.js';

function createPoolMerkleStatePort(state: StateBridgeAdapter): PoolMerkleStatePort {
  const stateService = createStellarStateService(state);
  return {
    get: (poolContract) => stateService.getPoolMerkleState(poolContract),
    set: (merkleState) => stateService.setPoolMerkleState(merkleState),
  };
}

function createLeafEphemeralStatePort(
  state: StateBridgeAdapter,
): LeafEphemeralStatePort {
  const stateService = createStellarStateService(state);
  return {
    get: (input) => stateService.getLeafEphemeral(input),
    set: (ephemeral) => stateService.setLeafEphemeral(ephemeral),
  };
}

function createSenderScalarStateResolver(state: StateBridgeAdapter) {
  const stateService = createStellarStateService(state);
  return async (input: {
    owner: string;
    privateAddressStpl1: string;
  }): Promise<string | undefined> => {
    const owner = input.owner.trim();
    if (!owner) {
      return;
    }
    const defaultNonce = await stateService.getWalletDefaultPrivateAddressNonce(owner);
    if (!defaultNonce) {
      return;
    }
    const requestedAddress = input.privateAddressStpl1.trim();
    const record = await stateService.getWalletPrivateAddressRecord({
      owner,
      nonce: defaultNonce,
    });
    const recordAddress = record?.privateAddress?.trim();
    if (recordAddress !== requestedAddress) {
      return;
    }
    const scalar = await stateService.getWalletPrivateAddressScalar({
      owner,
      nonce: defaultNonce,
    });
    const normalized = scalar?.scalarHex?.trim() ?? '';
    return normalized.length > 0 ? normalized : undefined;
  };
}

export function attachPoolStatePorts(
  transactEnvironment: StellarTransactEnvironment | undefined,
  state: StateBridgeAdapter,
): StellarTransactEnvironment | undefined {
  if (!transactEnvironment) {
    return undefined;
  }
  return {
    ...transactEnvironment,
    poolMerkleState: createPoolMerkleStatePort(state),
    leafEphemeral: createLeafEphemeralStatePort(state),
    resolveSenderPrivKeyScalarFromState: createSenderScalarStateResolver(state),
  };
}
