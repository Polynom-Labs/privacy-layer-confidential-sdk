# Changelog

## Unreleased

### Features

* require an explicit relay origin to enable Protocol Relay; unset origin Direct-submits and never calls the relayer
* bound settlement polling with backoff and a `settlement_timed_out` outcome

## [0.1.0](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/releases/tag/privacy-sdk-relay-v0.1.0) (2026-09-02)

### Features

* lift chain-agnostic protocol relay runtime into `@arcanetech/privacy-sdk-relay`
