# @arcanetech/privacy-sdk-relay

Chain-agnostic protocol relay runtime for Arcane private payment flows.

## Overview

This package owns admission, lifecycle polling, retry, and consented direct-submit fallback for prepared private operations. Callers supply a **six-port** surface; the runtime never inspects opaque package payloads and has no Stellar, Soroban, or zero-knowledge dependencies.

The six ports are:

- `relayApi` — transport used to admit a request, read lifecycle status, and retry an attempt
- `store` — pending-operation persistence (survives reload)
- `submitDirect` — caller-supplied wallet-signed submission (not serializable; after reload only polling and retry remain)
- `finalizeLocalState` — apply local record updates after success
- `drainDeliveries` — deliver output notes after success
- `persistUserTransaction` — record the user-visible transaction after success

## Quick example

```ts
import {
  createRelayApi,
  submitAndAwaitPrivateOperation,
  throwIfRelayUnsuccessful,
  type ProtocolRelayPorts,
} from '@arcanetech/privacy-sdk-relay';

const ports: ProtocolRelayPorts = {
  relayApi: createRelayApi({ baseUrl: relayOrigin }),
  store,
  submitDirect,
  finalizeLocalState,
  drainDeliveries,
  persistUserTransaction,
};

const result = await submitAndAwaitPrivateOperation({ ports, operation });
const { txId } = throwIfRelayUnsuccessful(result);
```

Substitute `relayApi` (or the optional `fetch` on `createRelayApi`) in tests. Direct submission stays a caller-supplied port because it closes over a prepared operation that cannot be serialized.

## Public API boundaries

- Bind ports in the application; keep chain-specific finalize, delivery, and persist adapters there.
- Pass the opaque relay package through unchanged. Routing uses `publicDepositAmount` and display kind only.
- After a reload, resume with `resumePendingOperations` and `retryFailedRelayAttempt`. Direct fallback requires an in-memory submitter the caller registered before unload.

## Related docs

- [Root README](../../README.md)
- [Packages](../../docs/overview/packages.mdx)
