import { describe, expect, it } from 'vitest';
import { validateStellarDisclosure } from '../src/policy/disclosure.js';
import type { StellarPendingClaim } from '../src/types.js';

const DOC_OWNER = 'GDSENDER7EXAMPLEPUBLICKEYAAAAAAAAAAAAAAAAAAAA';
const DOC_PRIVATE_ADDRESS = 'stpl1sender7exampleprivateaddress0000000000';
const DOC_RECIPIENT = 'GCRECIPIENT7EXAMPLEPUBLICKEYAAAAAAAAAAAAAAA';
const DOC_RECIPIENT_PRIVATE = 'stpl1recipient7exampleprivateaddress000000';
const DOC_ASSET = 'usdc';

const DOC_DEPOSIT_DISCLOSURE = {
  senderAddress: 'public' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'public' as const,
  amount: 'public' as const,
};

const DOC_WITHDRAW_DISCLOSURE = {
  senderAddress: 'private' as const,
  recipientAddress: 'public' as const,
  assetAddress: 'public' as const,
  amount: 'public' as const,
};

const DOC_TRANSFER_REGISTERED_DISCLOSURE = {
  senderAddress: 'private' as const,
  recipientAddress: 'private' as const,
  assetAddress: 'private' as const,
  amount: 'private' as const,
};

const DOC_TRANSFER_UNREGISTERED_DISCLOSURE = {
  senderAddress: 'private' as const,
  recipientAddress: 'public' as const,
  assetAddress: 'public' as const,
  amount: 'public' as const,
};

const pendingClaim: StellarPendingClaim = {
  id: '1',
  owner: 'G-OWNER',
  asset: 'USDC',
  amount: 25n,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('validateStellarDisclosure transfer routes', () => {
  it('requires recipient, asset, and amount public for public Stellar recipients', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: 'stpl1-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 10n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'private',
        amount: 'private',
      },
    });

    expect(errors.some((error) => error.code === 'unsupported_disclosure')).toBe(true);
    expect(
      errors.some(
        (error) =>
          error.code === 'unsupported_disclosure' && error.field === 'senderAddress',
      ),
    ).toBe(false);
    expect(
      errors.some(
        (error) =>
          error.code === 'unsupported_disclosure' && error.field === 'assetAddress',
      ),
    ).toBe(true);
    expect(
      errors.some(
        (error) => error.code === 'unsupported_disclosure' && error.field === 'amount',
      ),
    ).toBe(true);
  });

  it('accepts private sender for public Stellar recipients', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: 'stpl1-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 10n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'public',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(errors).toEqual([]);
  });

  it('accepts fully public disclosure for public Stellar recipients', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: 'stpl1-sender',
      to: 'G-RECIPIENT',
      asset: 'USDC',
      amount: 10n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'public',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(errors).toEqual([]);
  });

  it('requires sender, asset, and amount public for pending claim sources', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: { kind: 'pendingClaim', claim: pendingClaim },
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure: {
        senderAddress: 'private',
        recipientAddress: 'private',
        assetAddress: 'private',
        amount: 'private',
      },
    });

    expect(
      errors.some(
        (error) =>
          error.code === 'unsupported_disclosure' && error.field === 'senderAddress',
      ),
    ).toBe(true);
    expect(
      errors.some(
        (error) =>
          error.code === 'unsupported_disclosure' && error.field === 'assetAddress',
      ),
    ).toBe(true);
    expect(
      errors.some(
        (error) => error.code === 'unsupported_disclosure' && error.field === 'amount',
      ),
    ).toBe(true);
    expect(
      errors.some(
        (error) =>
          error.code === 'unsupported_disclosure' && error.field === 'recipientAddress',
      ),
    ).toBe(false);
  });

  it('accepts pending claim disclosure with private recipient', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: { kind: 'pendingClaim', claim: pendingClaim },
      to: 'stpl1-recipient',
      asset: 'USDC',
      amount: 25n,
      disclosure: {
        senderAddress: 'public',
        recipientAddress: 'private',
        assetAddress: 'public',
        amount: 'public',
      },
    });

    expect(errors).toEqual([]);
  });
});

describe('documentation disclosure examples', () => {
  it('accepts deposit disclosure from application development docs', () => {
    const errors = validateStellarDisclosure('deposit', {
      from: DOC_OWNER,
      to: DOC_PRIVATE_ADDRESS,
      asset: DOC_ASSET,
      amount: 500_000_000n,
      disclosure: DOC_DEPOSIT_DISCLOSURE,
    });

    expect(errors).toEqual([]);
  });

  it('accepts withdraw disclosure from application development docs', () => {
    const errors = validateStellarDisclosure('withdraw', {
      from: DOC_PRIVATE_ADDRESS,
      to: DOC_OWNER,
      asset: DOC_ASSET,
      amount: 400_000_000n,
      disclosure: DOC_WITHDRAW_DISCLOSURE,
    });

    expect(errors).toEqual([]);
  });

  it('accepts transfer registered disclosure from application development docs', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: DOC_PRIVATE_ADDRESS,
      to: DOC_RECIPIENT_PRIVATE,
      asset: DOC_ASSET,
      amount: 250_000_000n,
      disclosure: DOC_TRANSFER_REGISTERED_DISCLOSURE,
    });

    expect(errors).toEqual([]);
  });

  it('accepts transfer unregistered disclosure from application development docs', () => {
    const errors = validateStellarDisclosure('transfer', {
      from: DOC_PRIVATE_ADDRESS,
      to: DOC_RECIPIENT,
      asset: DOC_ASSET,
      amount: 250_000_000n,
      disclosure: DOC_TRANSFER_UNREGISTERED_DISCLOSURE,
    });

    expect(errors).toEqual([]);
  });
});
