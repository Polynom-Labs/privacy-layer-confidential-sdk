import { describe, expect, it } from 'vitest';
import {
  PENDING_OPERATION_PHASE,
  RelayApiError,
  canOfferDirectSubmission,
  pollPendingOperation,
  submitDirectFallback,
  submitPreparedPrivateOperation,
} from '../src/index.js';
import {
  createTestPorts,
  newOperation,
  TEST_OPERATION_ID,
  TEST_RELAY_REQUEST_ID,
  TEST_WALLET,
  testRelayStatus,
} from './relay-runtime.harness.js';

const RELAYER_UNAVAILABLE_STATUS = 503;

describe('protocol relay fallback gating', () => {
  it('offers consented fallback after pre-admission failure', async () => {
    const ports = createTestPorts({
      createRequest: async () => {
        throw new RelayApiError({
          reason: 'relayer_unavailable',
          httpStatus: RELAYER_UNAVAILABLE_STATUS,
        });
      },
    });
    const failed = await submitPreparedPrivateOperation({
      ports,
      operation: newOperation('0'),
    });
    expect(failed.outcome).toBe(PENDING_OPERATION_PHASE.admissionFailed);
    expect(canOfferDirectSubmission(failed.operation)).toBe(true);
    const consented = await submitDirectFallback({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
      consent: true,
    });
    expect(consented.txId).toBe('wallet-tx');
  });

  it('never offers direct fallback while submitted or reconciling', async () => {
    const ports = createTestPorts();
    await submitPreparedPrivateOperation({
      ports,
      operation: newOperation('0'),
    });
    ports.probe.statusById.set(TEST_RELAY_REQUEST_ID, testRelayStatus('submitted'));
    const submitted = await pollPendingOperation({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
    });
    expect(canOfferDirectSubmission(submitted.operation)).toBe(false);
    ports.probe.statusById.set(TEST_RELAY_REQUEST_ID, testRelayStatus('reconciling'));
    const reconciling = await pollPendingOperation({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
    });
    expect(canOfferDirectSubmission(reconciling.operation)).toBe(false);
  });
});
