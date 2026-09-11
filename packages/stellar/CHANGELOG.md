# Changelog

## [0.4.0](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/compare/privacy-sdk-stellar-v0.3.0...privacy-sdk-stellar-v0.4.0) (2026-09-10)


### Features

* expose signer-independent Relay Transact Package V1 ([ccc7d95](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/ccc7d95ed3301413a0dba99e24e48b35c3ed8868))
* **stellar:** cut over transact to owner-bound notes and escrow recipient ([2b5a552](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/2b5a552b858bd944428013b6c086a5f834c32bf5))
* **stellar:** refuse transfers to unregistered recipients ([b072391](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/b072391a2aec7ac4fbf55e87e8002b80f290ae6b))
* Update Stellar SDK references and enhance documentation for artifact handling ([0ff2d29](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/0ff2d292721ad8ffed218833e60073aac54cf06a))


### Bug Fixes

* **stellar:** always pass escrow_recipient on pool transact ([821e6e9](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/821e6e98725419795da536430794df6302a0280c))
* **stellar:** reduce spend scalars into the BabyJub subgroup order ([150605a](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/150605a7e4066c27f2e95535463af21797932b73))
* **stellar:** resolve spend scalar when checking owner-bound nullifiers ([57c159b](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/57c159b124ac068cd93971822ffa792a10f9eb42))

## [0.3.0](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/compare/privacy-sdk-stellar-v0.2.3...privacy-sdk-stellar-v0.3.0) (2026-07-13)


### Features

* updated pool contract signature ([752cb04](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/752cb0427f440a2603caa92fdb7ca2e0ffc34942))


### Bug Fixes

* ci linter issues ([4e6f635](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/4e6f6359c48138684444466ea407cc41f6fc5194))
* **release:** add repository metadata for npm provenance ([d07fdeb](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/d07fdebd28d5bd6868d10651147023c85e1da02b))
* wire dual-note withdraw like transfer ([d731bf8](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/d731bf837f2dc021ff82a6e57d2ddc395aa04ead))
* wire dual-note withdraw like transfer ([5db1ba9](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/5db1ba9309763804be867950ef3f4bdca03a8964))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @arcanetech/privacy-sdk-core bumped from * to 0.3.0
  * devDependencies
    * @arcanetech/privacy-sdk-state-memory bumped from 0.2.1 to 0.2.2
    * @arcanetech/privacy-sdk-state-redux bumped from 0.2.1 to 0.2.2

## [0.2.3](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/compare/privacy-sdk-stellar-v0.2.2...privacy-sdk-stellar-v0.2.3) (2026-07-08)


### Bug Fixes

* verify script sequence change ([61af505](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/61af505ede320fd0225e7916aaf3508ad93c7e48))

## [0.2.2](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/compare/privacy-sdk-stellar-v0.2.1...privacy-sdk-stellar-v0.2.2) (2026-07-08)


### Bug Fixes

* type issues resolve ([8b90cca](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/8b90ccac669892b3657e8b71353e148b0fcc4094))

## [0.2.1](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/compare/privacy-sdk-stellar-v0.2.0...privacy-sdk-stellar-v0.2.1) (2026-07-08)


### Bug Fixes

* internal deps versions resolve ([d2a8a08](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/d2a8a080d5d826a7caaa537e5de1a68baa6ae6be))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @arcanetech/privacy-sdk-state-memory bumped from * to 0.2.1
    * @arcanetech/privacy-sdk-state-redux bumped from * to 0.2.1

## [0.2.0](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/compare/privacy-sdk-stellar-v0.1.0...privacy-sdk-stellar-v0.2.0) (2026-07-07)


### Features

* init commit ([4facb76](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/4facb764b599538e645453f164688b1bc8cdb7fd))
* init version ([ea94962](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/ea9496258209b465992f000088f422b781173b98))


### Bug Fixes

* rename packages organization ([5b55673](https://github.com/Polynom-Labs/privacy-layer-confidential-sdk/commit/5b556730bc87eba59ab8935470508ddd5ffe3d52))
