export function isUnfinalizedRelayOperation(operation: {
  relayRequestId?: string;
  finalized: boolean;
}): boolean {
  return Boolean(operation.relayRequestId) && !operation.finalized;
}
