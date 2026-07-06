import { describe, expect, it, vi } from 'vitest';
import { adaptSignTransactionForGeneratedBinding } from '../src/contracts/signing.js';
import { parseStellarRpcUnixTimestampSeconds } from '../src/rpc/stellar-rpc-unix-timestamp.js';

describe('adaptSignTransactionForGeneratedBinding', () => {
  it('forwards xdr and defaults to configured wallet and network', async () => {
    const signTransaction = vi.fn(async () => ({ signedTxXdr: 'signed-xdr' }));
    const adapted = adaptSignTransactionForGeneratedBinding(signTransaction, {
      networkPassphrase: 'Test Network',
      walletPublicKey: 'G-WALLET',
    });
    const result = await adapted('unsigned-xdr');
    expect(signTransaction).toHaveBeenCalledWith({
      xdr: 'unsigned-xdr',
      networkPassphrase: 'Test Network',
      address: 'G-WALLET',
    });
    expect(result).toEqual({ signedTxXdr: 'signed-xdr' });
  });

  it('prefers generated binding option overrides', async () => {
    const signTransaction = vi.fn(async () => ({ signedTxXdr: 'signed-xdr' }));
    const adapted = adaptSignTransactionForGeneratedBinding(signTransaction, {
      networkPassphrase: 'Test Network',
      walletPublicKey: 'G-WALLET',
    });
    await adapted('unsigned-xdr', {
      networkPassphrase: 'Override Network',
      address: 'G-OTHER',
    });
    expect(signTransaction).toHaveBeenCalledWith({
      xdr: 'unsigned-xdr',
      networkPassphrase: 'Override Network',
      address: 'G-OTHER',
    });
  });
});

describe('parseStellarRpcUnixTimestampSeconds', () => {
  it('normalizes millisecond timestamps to seconds', () => {
    expect(parseStellarRpcUnixTimestampSeconds(1_700_000_000_000)).toBe(1_700_000_000);
  });

  it('returns second-granularity timestamps unchanged', () => {
    expect(parseStellarRpcUnixTimestampSeconds(1_700_000_000)).toBe(1_700_000_000);
  });
});
