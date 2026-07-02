## Learned User Preferences

- Keep all repository rules and agent guidance in English.
- Do not add React or NestJS-specific ESLint rules to this repository.
- Do not bypass lint or Fallow checks by weakening config files or adding disable comments.
- Do not regenerate or commit ptau/zkey artifacts inside this repository.

## Repository Tooling

| Area | Tooling |
| --- | --- |
| Workspace | npm workspaces under `packages/*` |
| Language | TypeScript only for source, tests, and executable config |
| Build | `tsup` per package |
| Tests | Vitest unit tests and type tests |
| Lint | ESLint flat config in `eslint.config.mjs` |
| Static analysis | Fallow dead-code and duplication baselines in `.fallow/baselines/` |
| Git hooks | Lefthook pre-commit runs lint and Fallow checks |
| Docs | English README files plus Mintlify docs in `docs/` |
| Releases | Release Please manifest mode plus GitHub Actions publish workflows |

## Package Boundaries

- `@arcane/privacy-sdk-core` must not depend on Stellar, Soroban, ZK, or `@auditable/privacy-pool-zk-sdk`. It is browser-first and must not import Node built-ins.
- `@arcane/privacy-sdk-stellar` main entry (`@arcane/privacy-sdk-stellar`) is browser-first: callers supply circuit artifacts as `ArrayBuffer`. Node filesystem loading lives only in `@arcane/privacy-sdk-stellar/node`. Test doubles live in `@arcane/privacy-sdk-stellar/testing`.
- `@auditable/privacy-pool-zk-sdk` is a browser-capable dependency when callers pass preloaded WASM/zkey buffers; do not rely on its Node filesystem fallbacks in browser integrations.
- `@arcane/privacy-sdk-testing` is planned but intentionally not shipped in this phase.

## Common Commands

```bash
npm install
npm run verify
npm run build
npm run test
npm run lint
npm run fallow:dead-code
npm run fallow:dupes
```

Refresh Fallow baselines only when the team intentionally changes expectations:

```bash
npm run fallow:save-baselines
```

## Design Patterns Available In This Repository

Use these patterns when they match the integration boundary you are implementing:

| Pattern | Prefer When |
| --- | --- |
| Composition | Building clients from wallet, storage, network, and policy adapters without deep inheritance trees |
| Observer | Emitting stable progress events through `ExecuteOptions.onEvent` during operation execution |
| Visitor | Applying operation-specific validation or transformation without switching on `OperationKind` throughout the codebase |
| Factory | Creating configured clients such as `createStellarPrivacyClient()` from environment-specific inputs |
| Abstract Factory | Providing browser and Node client factories that share orchestration but use different asset loaders |

See `.cursor/rules/design-patterns.mdc` for concise TypeScript examples and trigger guidance.

## Agent Guidelines

- Respect ESLint and Fallow baselines.
- Keep core public API free of network-specific terminology.
- Keep private audit decoding keys out of public types, docs, and tests.
- Add English README and Mintlify docs updates when public API changes.
