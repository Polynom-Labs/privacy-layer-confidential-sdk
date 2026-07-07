import {
  createStateBridge,
  type StateBridge,
  type StateBridgeAdapter,
} from '@arcanetech/privacy-sdk-core/state';
import { stellarStateDefinitions } from '../definitions/index.js';

export class StellarStateServiceBase {
  readonly bridge: StateBridge;

  constructor(adapter: StateBridgeAdapter) {
    this.bridge = createStateBridge(adapter);
    this.bridge.init(stellarStateDefinitions);
  }
}
