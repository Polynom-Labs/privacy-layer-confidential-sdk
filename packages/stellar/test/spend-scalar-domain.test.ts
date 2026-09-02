import { BABYJUB_SUBGROUP_ORDER } from '@auditable/privacy-pool-zk-sdk';
import { describe, expect, it } from 'vitest';
import {
  buildPrivateAddressSignMessage,
  OWNER_BOUND_NOTE_SCHEMA_VERSION,
  spendScalarHexFromStellarSignature,
} from '../src/transact/index.js';

const ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const SIGNATURE = '11'.repeat(64);
const BASE_DOMAIN = {
  networkPassphrase: 'Test SDF Network ; September 2015',
  poolContract: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
  registryContract: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAK3IM',
};

describe('spend-scalar sign message', () => {
  it('binds network, pool, registry, and schema version and authorizes spending', () => {
    const message = buildPrivateAddressSignMessage(ADDRESS, BASE_DOMAIN);
    expect(message).toContain(BASE_DOMAIN.networkPassphrase);
    expect(message).toContain(BASE_DOMAIN.poolContract);
    expect(message).toContain(BASE_DOMAIN.registryContract);
    expect(message).toContain(
      `owner-bound-note-v${String(OWNER_BOUND_NOTE_SCHEMA_VERSION)}`,
    );
    expect(message).not.toMatch(/will not authorize any transaction/i);
    expect(message).toMatch(/authorizes spending/i);
  });

  it('derives different spend scalars across network, pool, registry, and schema', async () => {
    const base = await spendScalarHexFromStellarSignature(SIGNATURE, BASE_DOMAIN);
    const otherNetwork = await spendScalarHexFromStellarSignature(SIGNATURE, {
      ...BASE_DOMAIN,
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
    const otherPool = await spendScalarHexFromStellarSignature(SIGNATURE, {
      ...BASE_DOMAIN,
      poolContract: 'CBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4',
    });
    const otherRegistry = await spendScalarHexFromStellarSignature(SIGNATURE, {
      ...BASE_DOMAIN,
      registryContract: 'CBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4',
    });
    const otherSchema = await spendScalarHexFromStellarSignature(SIGNATURE, {
      ...BASE_DOMAIN,
      schemaVersion: OWNER_BOUND_NOTE_SCHEMA_VERSION + 1,
    });
    expect(base).not.toBe(otherNetwork);
    expect(base).not.toBe(otherPool);
    expect(base).not.toBe(otherRegistry);
    expect(base).not.toBe(otherSchema);
    expect(BigInt(`0x${base}`) > 0n).toBe(true);
    expect(BigInt(`0x${base}`) < BABYJUB_SUBGROUP_ORDER).toBe(true);
  });
});
