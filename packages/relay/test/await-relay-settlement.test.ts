import { describe, expect, it } from 'vitest';
import {
  PENDING_OPERATION_PHASE,
  SUBMISSION_PATH,
  awaitRelaySettlement,
  submitPreparedPrivateOperation,
} from '../src/index.js';
import {
  createTestPorts,
  newOperation,
  succeededStatus,
  TEST_OPERATION_ID,
  TEST_RELAY_REQUEST_ID,
  TEST_TX_HASH,
  TEST_WALLET,
  testRelayStatus,
} from './relay-runtime.harness.js';

const SETTLEMENT_MAX_ATTEMPTS = 4;
const POLL_INTERVAL_MS = 10;
const BACKOFF_MULTIPLIER = 2;

describe('awaitRelaySettlement bounds', () => {
  it('stops polling a transport that never settles and reports settlement_timed_out', async () => {
    const ports = createTestPorts();
    await submitPreparedPrivateOperation({
      ports,
      operation: newOperation(SUBMISSION_PATH.relay),
    });
    ports.probe.statusById.set(TEST_RELAY_REQUEST_ID, testRelayStatus('queued'));
    const delays: number[] = [];
    const result = await awaitRelaySettlement({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
      pollIntervalMs: POLL_INTERVAL_MS,
      maxAttempts: SETTLEMENT_MAX_ATTEMPTS,
      backoffMultiplier: BACKOFF_MULTIPLIER,
      delay: async (ms) => {
        delays.push(ms);
      },
    });
    expect(result.outcome).toBe(PENDING_OPERATION_PHASE.settlementTimedOut);
    expect(delays).toEqual([
      POLL_INTERVAL_MS,
      POLL_INTERVAL_MS * BACKOFF_MULTIPLIER,
      POLL_INTERVAL_MS * BACKOFF_MULTIPLIER * BACKOFF_MULTIPLIER,
    ]);
  });

  it('returns success when settlement happens before the bound', async () => {
    const ports = createTestPorts();
    await submitPreparedPrivateOperation({
      ports,
      operation: newOperation(SUBMISSION_PATH.relay),
    });
    ports.probe.statusById.set(TEST_RELAY_REQUEST_ID, succeededStatus());
    const result = await awaitRelaySettlement({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
      pollIntervalMs: POLL_INTERVAL_MS,
      maxAttempts: SETTLEMENT_MAX_ATTEMPTS,
      delay: async () => {
        throw new Error('delay must not run after settlement');
      },
    });
    expect(result.outcome).toBe(PENDING_OPERATION_PHASE.succeeded);
    expect(result.txId).toBe(TEST_TX_HASH);
  });

  it('returns rejection when the relayer rejects before the bound', async () => {
    const ports = createTestPorts();
    await submitPreparedPrivateOperation({
      ports,
      operation: newOperation(SUBMISSION_PATH.relay),
    });
    ports.probe.statusById.set(
      TEST_RELAY_REQUEST_ID,
      testRelayStatus('rejected', { publicReason: 'kyt_rejected' }),
    );
    const result = await awaitRelaySettlement({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
      pollIntervalMs: POLL_INTERVAL_MS,
      maxAttempts: SETTLEMENT_MAX_ATTEMPTS,
      delay: async () => {
        throw new Error('delay must not run after settlement');
      },
    });
    expect(result.outcome).toBe(PENDING_OPERATION_PHASE.rejected);
    expect(result.operation.publicReason).toBe('kyt_rejected');
  });
});
