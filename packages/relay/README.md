# @arcanetech/privacy-sdk-relay

Chain-agnostic protocol relay runtime for Arcane private payment flows.

## Overview

This package owns admission, lifecycle polling, retry, and consented direct-submit fallback for prepared private operations. Callers supply five required ports; `relayApi` and `relayConfig` are optional and enable Protocol Relay. The runtime never inspects opaque package payloads and has no Stellar, Soroban, or zero-knowledge dependencies.

The ports are:

- `store` — pending-operation persistence (survives reload)
- `submitDirect` — caller-supplied wallet-signed submission (not serializable; after reload only polling and retry remain)
- `finalizeLocalState` — apply local record updates after success
- `drainDeliveries` — deliver output notes after success
- `persistUserTransaction` — record the user-visible transaction after success
- `relayConfig` / `relayApi` — optional origin and transport used to admit a request, read lifecycle status, and retry an attempt

## Quick example

```ts
import {
  createRelayApi,
  resolveRelayOrigin,
  submitAndAwaitPrivateOperation,
  throwIfRelayUnsuccessful,
  type ProtocolRelayPorts,
} from '@arcanetech/privacy-sdk-relay';

const origin = resolveRelayOrigin(relayOriginFromEnv);
const ports: ProtocolRelayPorts = {
  store,
  submitDirect,
  finalizeLocalState,
  drainDeliveries,
  persistUserTransaction,
  ...(origin
    ? { relayConfig: { origin }, relayApi: createRelayApi({ origin }) }
    : {}),
};

const result = await submitAndAwaitPrivateOperation({ ports, operation });
const { txId } = throwIfRelayUnsuccessful(result);
```

Relaying is off until `relayConfig.origin` is set. An unset origin Direct-submits even when the caller marks the operation as `relay`, and the relayer is never contacted.

Substitute `relayApi` (or the optional `fetch` on `createRelayApi`) in tests. Direct submission stays a caller-supplied port because it closes over a prepared operation that cannot be serialized.

## Public API boundaries

- Bind ports in the application; keep chain-specific finalize, delivery, and persist adapters there.
- Pass the opaque relay package through unchanged. Routing follows the caller-supplied `submissionPath`; this package does not inspect deposit amounts or display kind.
- This package owns the wire vocabulary: lifecycle statuses (`RELAY_STATUS`), public/HTTP reason codes, and JSON serialization (`serializeRelayPackage` / `deserializeRelayPackage`). Serialization copies package fields only and never inspects proof or public-signal bytes.
- After a reload, resume with `resumePendingOperations` and `retryFailedRelayAttempt`. Direct fallback requires an in-memory submitter the caller registered before unload.

## Related docs

- [Root README](../../README.md)
- [Packages](../../docs/overview/packages.mdx)
