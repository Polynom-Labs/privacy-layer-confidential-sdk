import { describe, expect, it } from 'vitest';
import {
  PENDING_OPERATION_PHASE,
  canOfferDirectSubmission,
  canRetryRelayAttempt,
  pollPendingOperation,
  retryFailedRelayAttempt,
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

describe('protocol relay retry', () => {
  it('shows a stable rejection reason and does not offer direct fallback', async () => {
    const ports = createTestPorts();
    await submitPreparedPrivateOperation({
      ports,
      operation: newOperation('0'),
    });
    ports.probe.statusById.set(
      TEST_RELAY_REQUEST_ID,
      testRelayStatus('rejected', { publicReason: 'kyt_rejected' }),
    );
    const result = await pollPendingOperation({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
    });
    expect(result.outcome).toBe(PENDING_OPERATION_PHASE.rejected);
    expect(result.operation.publicReason).toBe('kyt_rejected');
    expect(canOfferDirectSubmission(result.operation)).toBe(false);
    await expect(
      submitDirectFallback({
        ports,
        walletPublicKey: TEST_WALLET,
        operationId: TEST_OPERATION_ID,
        consent: true,
      }),
    ).rejects.toThrow(/not allowed/i);
  });

  it('offers retry only when failed and the API allows it', async () => {
    const ports = createTestPorts();
    await submitPreparedPrivateOperation({
      ports,
      operation: newOperation('0'),
    });
    ports.probe.statusById.set(
      TEST_RELAY_REQUEST_ID,
      testRelayStatus('failed', {
        retryAllowed: true,
        publicReason: 'infrastructure_failed',
      }),
    );
    const failed = await pollPendingOperation({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
    });
    expect(canRetryRelayAttempt(failed.operation)).toBe(true);
    expect(canOfferDirectSubmission(failed.operation)).toBe(false);
    ports.probe.statusById.set(TEST_RELAY_REQUEST_ID, testRelayStatus('queued'));
    const retried = await retryFailedRelayAttempt({
      ports,
      walletPublicKey: TEST_WALLET,
      operationId: TEST_OPERATION_ID,
    });
    expect(retried.outcome).toBe(PENDING_OPERATION_PHASE.relayAccepted);
    expect(canOfferDirectSubmission(retried.operation)).toBe(false);
  });
});
