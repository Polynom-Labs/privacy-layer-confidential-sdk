import type { StellarTransactEnvironment } from '../environment/types.js';
import {
  feeQuoteRequestBody,
  type FeeQuote,
  type FeeQuoteRequest,
} from './quote-request-body.js';

type QuoteRequiredFeeInput = {
  transactEnvironment: StellarTransactEnvironment;
  request: FeeQuoteRequest;
};

function quoteHeaders(inspectAuthorization?: string): Record<string, string> {
  const token = inspectAuthorization?.trim();
  return {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function parseRequiredFee(raw: unknown): bigint {
  const text = `${raw ?? ''}`.trim();
  if (!/^\d+$/u.test(text)) {
    throw new Error('Fee Quote Required Fee must be an integer minor-unit string.');
  }
  return BigInt(text);
}

function requireQuoteString(raw: unknown, field: string): string {
  const text = `${raw ?? ''}`.trim();
  if (!text) {
    throw new Error(`Fee Quote is missing ${field}.`);
  }
  return text;
}

function parseQuotePayload(payload: Record<string, unknown>): FeeQuote {
  return {
    requiredFee: parseRequiredFee(payload.requiredFee),
    feeAsset: requireQuoteString(payload.feeAsset, 'Fee Asset'),
    feeCollectorPrivateAddress: requireQuoteString(
      payload.feeCollectorPrivateAddress,
      'Fee Collector Private Address',
    ),
    feeRate: requireQuoteString(payload.feeRate, 'Fee Rate'),
  };
}

export async function quoteRequiredFee(
  input: QuoteRequiredFeeInput,
): Promise<FeeQuote> {
  const response = await fetch(
    `${input.transactEnvironment.kyt.apiBaseUrl}/kyt/fees/quote`,
    {
      method: 'POST',
      headers: quoteHeaders(input.transactEnvironment.kyt.inspectAuthorization),
      body: JSON.stringify(feeQuoteRequestBody(input.request)),
    },
  );
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Fee Quote failed: ${JSON.stringify(payload)}`);
  }
  return parseQuotePayload(payload);
}
