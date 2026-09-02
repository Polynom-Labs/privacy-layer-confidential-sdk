import {
  type NewPrivateOperation,
  type PendingPrivateOperation,
  type ProtocolRelayPorts,
  type RelayApi,
  type RelayPackageJson,
  type RelayRequestStatus,
  type SubmissionPath,
} from '../src/index.js';

export const TEST_WALLET = 'GTESTWALLET';
export const TEST_OPERATION_ID = 'op-1';
export const TEST_RELAY_REQUEST_ID = 'relay-1';
export const TEST_TX_HASH = 'txhash-succeeded';

export type OrchestrationProbe = {
  order: string[];
  finalizeCalls: string[];
  drainCalls: string[];
  txCalls: string[];
  directCalls: string[];
  statusById: Map<string, RelayRequestStatus>;
};

export type TestPorts = ProtocolRelayPorts & {
  probe: OrchestrationProbe;
  relayApi: RelayApi;
};

function emptyPackage(): RelayPackageJson {
  return {
    version: 1,
    poolSelector: 'CPOOL',
    zkConfigNonce: '0',
    proofBytes: 'aa',
    publicSignals: 'bb',
    applicationIdHints: ['1', '1', '0', '0'],
  };
}

export function newOperation(submissionPath: SubmissionPath): NewPrivateOperation {
  return {
    id: TEST_OPERATION_ID,
    walletPublicKey: TEST_WALLET,
    submissionPath,
    display: {
      kind: 'withdraw',
      assetId: 'USDC',
      amountDisplay: 10,
      counterparty: TEST_WALLET,
      senderPrivateAddress: 'stpl1sender',
    },
    snapshot: { consumedRecordIds: ['note-1'], outputRecords: [] },
    deliveryOutbox: [
      {
        recipientPrivateAddress: 'stpl1change',
        commitmentHex: 'cc',
        coinNote: { value: '1' },
        depositScalarHex: 'dd',
        assetId: 'USDC',
        amountDisplay: 1,
      },
    ],
    relayPackage: emptyPackage(),
  };
}

function createMemoryStore() {
  const items = new Map<string, PendingPrivateOperation>();
  return {
    async save(operation: PendingPrivateOperation) {
      items.set(`${operation.walletPublicKey}:${operation.id}`, operation);
    },
    async list(walletPublicKey: string) {
      return [...items.values()].filter(
        (item) => item.walletPublicKey === walletPublicKey,
      );
    },
    async read(input: { walletPublicKey: string; operationId: string }) {
      return items.get(`${input.walletPublicKey}:${input.operationId}`);
    },
  };
}

export function testRelayStatus(
  status: string,
  extras?: { retryAllowed?: boolean; publicReason?: string },
): RelayRequestStatus {
  const body: RelayRequestStatus = {
    relayRequestId: TEST_RELAY_REQUEST_ID,
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:02.000Z',
    retryAllowed: extras?.retryAllowed === true,
  };
  if (extras?.publicReason) {
    body.publicReason = extras.publicReason;
  }
  return body;
}

export function succeededStatus(): RelayRequestStatus {
  return {
    relayRequestId: TEST_RELAY_REQUEST_ID,
    status: 'succeeded',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:02.000Z',
    retryAllowed: false,
    transactionHash: TEST_TX_HASH,
  };
}

function createEmptyProbe(): OrchestrationProbe {
  return {
    order: [],
    finalizeCalls: [],
    drainCalls: [],
    txCalls: [],
    directCalls: [],
    statusById: new Map(),
  };
}

function createSubstitutedRelayApi(
  probe: OrchestrationProbe,
  overrides?: Partial<RelayApi>,
): RelayApi {
  return {
    async createRequest() {
      return {
        relayRequestId: TEST_RELAY_REQUEST_ID,
        status: 'accepted',
        createdAt: '2026-01-01T00:00:00.000Z',
        statusUrl: `/relay-requests/${TEST_RELAY_REQUEST_ID}`,
      };
    },
    async readStatus(relayRequestId) {
      const current = probe.statusById.get(relayRequestId);
      if (!current) {
        throw new Error('missing status');
      }
      return current;
    },
    async retryAttempt(relayRequestId) {
      return {
        relayRequestId,
        status: 'accepted',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:01.000Z',
        retryAllowed: false,
      };
    },
    ...overrides,
  };
}

function bindProbedStore(
  probe: OrchestrationProbe,
  store: ReturnType<typeof createMemoryStore>,
): ProtocolRelayPorts['store'] {
  return {
    async save(operation) {
      if (probe.order.at(-1) !== 'save') {
        probe.order.push('save');
      }
      await store.save(operation);
    },
    list: store.list,
    read: store.read,
  };
}

export function createTestPorts(relayApi?: Partial<RelayApi>): TestPorts {
  const probe = createEmptyProbe();
  return {
    probe,
    relayApi: createSubstitutedRelayApi(probe, relayApi),
    relayConfig: { origin: 'http://relay.test' },
    store: bindProbedStore(probe, createMemoryStore()),
    async submitDirect() {
      probe.directCalls.push('direct');
      return { txId: 'wallet-tx' };
    },
    async finalizeLocalState(input) {
      probe.finalizeCalls.push(input.txId);
    },
    async drainDeliveries(input): Promise<undefined> {
      probe.drainCalls.push(input.txId);
    },
    persistUserTransaction(input) {
      probe.txCalls.push(input.txId);
    },
  };
}
