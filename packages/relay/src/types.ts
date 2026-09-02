export const SUBMISSION_PATH = {
  direct: 'direct',
  relay: 'relay',
} as const;

export type SubmissionPath = (typeof SUBMISSION_PATH)[keyof typeof SUBMISSION_PATH];

export const RELAY_STATUS = {
  accepted: 'accepted',
  validating: 'validating',
  queued: 'queued',
  submitted: 'submitted',
  reconciling: 'reconciling',
  succeeded: 'succeeded',
  rejected: 'rejected',
  failed: 'failed',
} as const;

export type RelayLifecycleStatus = (typeof RELAY_STATUS)[keyof typeof RELAY_STATUS];

export const PENDING_OPERATION_PHASE = {
  prepared: 'prepared',
  relayAccepted: 'relay_accepted',
  admissionFailed: 'admission_failed',
  succeeded: 'succeeded',
  rejected: 'rejected',
  failed: 'failed',
  settlementTimedOut: 'settlement_timed_out',
} as const;

export type PendingOperationPhase =
  (typeof PENDING_OPERATION_PHASE)[keyof typeof PENDING_OPERATION_PHASE];

export type RelayPackageJson = {
  version: number;
  poolSelector: string;
  zkConfigNonce: string;
  proofBytes: string;
  publicSignals: string;
  applicationIdHints: [string, string, string, string];
  escrowRecipient?: string;
  keyVersionHints?: Array<number | undefined>;
};

export type SafeDisplayMetadata = {
  kind: 'deposit' | 'transfer' | 'withdraw' | 'pending_claim' | 'onboarding';
  assetId: string;
  amountDisplay: number;
  counterparty: string;
  senderPrivateAddress: string;
};

export type DeliveryOutboxEntry = {
  recipientPrivateAddress: string;
  commitmentHex: string;
  coinNote: Record<string, string>;
  depositScalarHex: string;
  precommitementHex?: string;
  assetId: string;
  amountDisplay: number;
};

export type SdkFinalizationSnapshot = {
  consumedRecordIds: string[];
  outputRecords: DeliveryOutboxEntry[];
};

export type PendingPrivateOperation = {
  id: string;
  walletPublicKey: string;
  phase: PendingOperationPhase;
  retryAllowed: boolean;
  display: SafeDisplayMetadata;
  snapshot: SdkFinalizationSnapshot;
  deliveryOutbox: DeliveryOutboxEntry[];
  relayPackage: RelayPackageJson;
  finalized: boolean;
  deliveriesDrained: boolean;
  transactionPersisted: boolean;
  escrowSend?: boolean;
  relayRequestId?: string;
  relayStatus?: RelayLifecycleStatus;
  publicReason?: string;
  transactionHash?: string;
};

export type RelayRequestAccepted = {
  relayRequestId: string;
  status: string;
  createdAt: string;
  statusUrl: string;
};

export type RelayRequestStatus = {
  relayRequestId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  retryAllowed: boolean;
  attemptNumber?: number;
  transactionHash?: string;
  publicReason?: string;
};

export type RelayApi = {
  createRequest: (body: RelayPackageJson) => Promise<RelayRequestAccepted>;
  readStatus: (relayRequestId: string) => Promise<RelayRequestStatus>;
  retryAttempt: (relayRequestId: string) => Promise<RelayRequestStatus>;
};

export type PendingPrivateOperationStore = {
  save: (operation: PendingPrivateOperation) => Promise<void>;
  list: (walletPublicKey: string) => Promise<PendingPrivateOperation[]>;
  read: (input: {
    walletPublicKey: string;
    operationId: string;
  }) => Promise<PendingPrivateOperation | undefined>;
};

export type RelayRuntimeConfig = {
  origin: string;
};

export type ProtocolRelayPorts = {
  relayApi?: RelayApi;
  relayConfig?: RelayRuntimeConfig;
  store: PendingPrivateOperationStore;
  submitDirect: (operation: PendingPrivateOperation) => Promise<{ txId: string }>;
  finalizeLocalState: (input: {
    operation: PendingPrivateOperation;
    txId: string;
  }) => Promise<void>;
  drainDeliveries: (input: {
    operation: PendingPrivateOperation;
    txId: string;
  }) => Promise<string | undefined>;
  persistUserTransaction: (input: {
    operation: PendingPrivateOperation;
    txId: string;
  }) => void;
};

export type NewPrivateOperation = {
  id: string;
  walletPublicKey: string;
  submissionPath: SubmissionPath;
  display: SafeDisplayMetadata;
  snapshot: SdkFinalizationSnapshot;
  deliveryOutbox: DeliveryOutboxEntry[];
  relayPackage: RelayPackageJson;
  escrowSend?: boolean;
};

export type SubmitPrivateOperationResult = {
  outcome: PendingOperationPhase;
  operation: PendingPrivateOperation;
  txId?: string;
  coinDeliveryWarning?: string;
  fallbackAllowed: boolean;
  retryAllowed: boolean;
};

export type CreateRelayApiInput = {
  origin: string;
  fetch?: typeof globalThis.fetch;
};
