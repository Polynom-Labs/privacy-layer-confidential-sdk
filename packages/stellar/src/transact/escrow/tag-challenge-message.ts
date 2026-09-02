export type BlindedRecipientTagChallengeFields = {
  stellarAddress: string;
  networkPassphrase: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
};

export function buildBlindedRecipientTagChallengeMessage(
  fields: BlindedRecipientTagChallengeFields,
): string {
  return [
    'Arcane privacy layer: issue your blinded recipient tags.',
    '',
    `Wallet: ${fields.stellarAddress}`,
    `Network: ${fields.networkPassphrase}`,
    `Issued: ${fields.issuedAt}`,
    `Expires: ${fields.expiresAt}`,
    `Nonce: ${fields.nonce}`,
    '',
    'This signature proves you control the wallet. It is the same kind of signed challenge used to derive your private-note spend key.',
  ].join('\n');
}
