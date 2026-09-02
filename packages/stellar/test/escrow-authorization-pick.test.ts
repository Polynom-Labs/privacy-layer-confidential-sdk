import { Address, xdr } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { pickUnsignedEscrowAuthorization } from '../src/transact/escrow/pick-escrow-authorization.js';
import { unsignedEscrowAuthorizationForSweep } from '../src/transact/escrow/simulate-escrow-authorization.js';
import type { StellarPreparedOperation } from '../src/types.js';
import type { StellarTransactEnvironment } from '../src/transact/environment/types.js';

const CLAIMANT = 'GCCF54SH7AJBAEX6GZLJSUNXJCGSY4YBO5IJRBXETXRG6SSGUX7OSTZD';
const OTHER = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const POOL = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

function invocation(): xdr.SorobanAuthorizedInvocation {
  return new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new xdr.InvokeContractArgs({
        contractAddress: new Address(POOL).toScAddress(),
        functionName: 'transact',
        args: [],
      }),
    ),
    subInvocations: [],
  });
}

function addressAuth(address: string): xdr.SorobanAuthorizationEntry {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(address).toScAddress(),
        nonce: new xdr.Int64('0'),
        signatureExpirationLedger: 1,
        signature: xdr.ScVal.scvVoid(),
      }),
    ),
    rootInvocation: invocation(),
  });
}

function sourceAuth(): xdr.SorobanAuthorizationEntry {
  return new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: invocation(),
  });
}

describe('unsigned escrow authorization from simulation', () => {
  it('picks the claimant address entry and ignores source-account auth', () => {
    const claimantEntry = addressAuth(CLAIMANT);
    const xdrBase64 = pickUnsignedEscrowAuthorization({
      auth: [sourceAuth(), addressAuth(OTHER), claimantEntry],
      claimantAddress: CLAIMANT,
    });
    expect(xdrBase64).toBe(claimantEntry.toXDR('base64'));
    expect(xdrBase64).not.toBe('AAAAAGVsc2Vjcm93LWF1dGgtZW50cnk=');
  });

  it('rejects simulation auth that has no claimant address entry', () => {
    expect(() =>
      pickUnsignedEscrowAuthorization({
        auth: [sourceAuth(), addressAuth(OTHER)],
        claimantAddress: CLAIMANT,
      }),
    ).toThrow('Simulation did not return a claimant authorization entry.');
  });

  it('refuses to simulate a sweep without the relayer public key', async () => {
    const prepared = {
      transactArtifacts: {
        proofHex: 'aa',
        publicHex: 'bb',
        escrowRecipient: CLAIMANT,
      },
    } as StellarPreparedOperation;
    await expect(
      unsignedEscrowAuthorizationForSweep({
        prepared,
        transactEnvironment: {} as StellarTransactEnvironment,
        relayerPublicKey: '   ',
      }),
    ).rejects.toThrow('Escrow sweep simulation requires the relayer public key.');
  });

  it('refuses to simulate a sweep missing proved artifacts', async () => {
    await expect(
      unsignedEscrowAuthorizationForSweep({
        prepared: { transactArtifacts: {} } as StellarPreparedOperation,
        transactEnvironment: {} as StellarTransactEnvironment,
        relayerPublicKey: CLAIMANT,
      }),
    ).rejects.toThrow('Prepared sweep is missing proof, public signals, or claimant.');
  });
});
