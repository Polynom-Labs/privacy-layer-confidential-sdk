export class KytInspectError extends Error {
  readonly reasonCode: string;
  readonly decisionId?: string;
  readonly detailAddress?: string;

  constructor(parameters: {
    message: string;
    reasonCode: string;
    decisionId?: string;
    detailAddress?: string;
  }) {
    super(parameters.message);
    this.name = 'KytInspectError';
    this.reasonCode = parameters.reasonCode;
    if (parameters.decisionId !== undefined) {
      this.decisionId = parameters.decisionId;
    }
    if (parameters.detailAddress !== undefined) {
      this.detailAddress = parameters.detailAddress;
    }
  }
}

export function parseKytReasonCode(reasonCode: string): {
  code: string;
  address?: string;
} {
  const separatorIndex = reasonCode.indexOf(':');
  if (separatorIndex === -1) {
    return { code: reasonCode };
  }
  return {
    code: reasonCode.slice(0, separatorIndex),
    address: reasonCode.slice(separatorIndex + 1),
  };
}
