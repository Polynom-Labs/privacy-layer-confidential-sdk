import { describe, expect, it } from 'vitest';
import { buildBlindedRecipientTagChallengeMessage } from '../src/transact/index.js';

const ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const NETWORK = 'Test SDF Network ; September 2015';
const ISSUED = '2026-09-02T12:00:00.000Z';
const EXPIRES = '2026-09-02T12:05:00.000Z';
const NONCE = 'aa'.repeat(16);

describe('blinded recipient tag challenge', () => {
  it('uses the same signed-challenge shape as private-address spend-key derivation', () => {
    const message = buildBlindedRecipientTagChallengeMessage({
      stellarAddress: ADDRESS,
      networkPassphrase: NETWORK,
      issuedAt: ISSUED,
      expiresAt: EXPIRES,
      nonce: NONCE,
    });
    expect(message).toBe(
      [
        'Arcane privacy layer: issue your blinded recipient tags.',
        '',
        `Wallet: ${ADDRESS}`,
        `Network: ${NETWORK}`,
        `Issued: ${ISSUED}`,
        `Expires: ${EXPIRES}`,
        `Nonce: ${NONCE}`,
        '',
        'This signature proves you control the wallet. It is the same kind of signed challenge used to derive your private-note spend key.',
      ].join('\n'),
    );
    expect(message).toContain('Wallet:');
    expect(message).toContain('Nonce:');
  });
});
