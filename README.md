# Privacy Layer SDK

English-language monorepo for the Arcane high-level privacy SDK.

## Table of Contents

- [Packages](#packages)
- [Requirements](#requirements)
- [Getting Started](#getting-started)
- [Repository Commands](#repository-commands)
- [Documentation](#documentation)
- [Release Process](#release-process)
- [Package READMEs](#package-readmes)

## Packages

| Package | Description |
| --- | --- |
| [`@arcane/privacy-sdk-core`](./packages/core/README.md) | Network-agnostic intents, prepared operations, errors, progress events, and adapter contracts |
| [`@arcane/privacy-sdk-stellar`](./packages/stellar/README.md) | Stellar preset with browser and Node entrypoints |

`@arcane/privacy-sdk-testing` is planned but intentionally not shipped in this phase.

## Requirements

- Node.js `>=20.10`
- npm workspaces

## Getting Started

```bash
npm install
npm run verify
```

Example browser usage:

```ts
import {
  createStellarPrivacyClient,
  isStellarPrivacyClient,
} from '@arcane/privacy-sdk-stellar';
import { isPreparedOperation } from '@arcane/privacy-sdk-core';

const clientOrRejected = await createStellarPrivacyClient({
  network: {
    id: 'testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    poolContract: 'C-POOL',
    registryContract: 'C-REGISTRY',
    applicationId: '101',
  },
  wallet,
  storage,
  assets: {
    sdkWasm: await fetch('/assets/client_sdk_wasm_bg.wasm').then((r) => r.arrayBuffer()),
    circuitWasm: await fetch('/assets/main.wasm').then((r) => r.arrayBuffer()),
    provingKey: await fetch('/assets/main_final.zkey').then((r) => r.arrayBuffer()),
  },
});

if (!isStellarPrivacyClient(clientOrRejected)) {
  throw new Error(clientOrRejected.errors.map((error) => error.message).join('; '));
}

const operation = await clientOrRejected.deposit(intent);

if (!isPreparedOperation(operation)) {
  throw new Error(operation.errors.map((error) => error.message).join('; '));
}

await operation.execute();
```

## Repository Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Build all workspace packages |
| `npm run test` | Run unit and type tests |
| `npm run typecheck` | Run TypeScript project references |
| `npm run lint` | Run ESLint |
| `npm run fallow:dead-code` | Compare dead-code baseline |
| `npm run fallow:dupes` | Compare duplication baseline |
| `npm run verify` | Lint, typecheck, test, build, and Fallow checks |

## Documentation

Mintlify docs live under [`docs/`](./docs). Run the local preview from that directory:

```bash
cd docs
mint dev
```

Site configuration is in [`docs/docs.json`](./docs/docs.json). The repository root [`docs.json`](./docs.json) mirrors navigation paths for hosted deployment.

## Release Process

- Conventional Commits drive version bumps through Release Please.
- `.github/workflows/version.yml` opens release PRs.
- `.github/workflows/release.yml` verifies, builds, and publishes workspace packages.

## Package READMEs

- [Core package README](./packages/core/README.md)
- [Stellar package README](./packages/stellar/README.md)
