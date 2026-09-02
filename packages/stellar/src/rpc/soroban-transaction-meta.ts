import { Address, StrKey, xdr } from '@stellar/stellar-sdk';

const BIGINT_SHIFT_64 = 64n;
const TRANSACTION_META_SWITCH_SOROBAN_V3 = 3;
const TRANSACTION_META_SWITCH_SOROBAN_V4 = 4;
const MIN_TRANSFER_EVENT_TOPIC_COUNT = 3;
const CONTRACT_EVENT_BODY_V0 = 0;

function extractSymbolFromScValue(value: xdr.ScVal): string | undefined {
  try {
    const variant = value.switch().name;
    if (variant === 'scvSymbol') {
      return value.sym().toString();
    }
    if (variant === 'scvString') {
      return value.str().toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function extractAmountFromScValue(value: xdr.ScVal): string | undefined {
  try {
    const variant = value.switch().name;
    if (variant === 'scvString') {
      return value.str().toString();
    }
    if (variant === 'scvI128') {
      const parts = value.i128();
      const hi = BigInt(parts.hi().toString());
      const lo = BigInt(parts.lo().toString());
      return ((hi << BIGINT_SHIFT_64) + lo).toString();
    }
    if (variant === 'scvI64') {
      return value.i64().toString();
    }
    if (variant === 'scvU64') {
      return value.u64().toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function contractIdToString(contractId: Buffer | Uint8Array): string {
  return StrKey.encodeContract(Buffer.from(contractId));
}

function scAddressToContractString(address: xdr.ScAddress): string | undefined {
  if (address.switch().name !== 'scAddressTypeContract') {
    return undefined;
  }
  try {
    return contractIdToString(
      Buffer.from(address.contractId() as unknown as Uint8Array),
    );
  } catch {
    return undefined;
  }
}

function pushSorobanV3ContractEvents(
  out: xdr.ContractEvent[],
  meta: xdr.TransactionMeta,
): void {
  const soroban = meta.v3().sorobanMeta();
  if (!soroban) {
    return;
  }
  for (const event of soroban.events()) {
    out.push(event);
  }
}

function pushSorobanV4ContractEvents(
  out: xdr.ContractEvent[],
  meta: xdr.TransactionMeta,
): void {
  const v4 = meta.v4();
  for (const txEvent of v4.events()) {
    out.push(txEvent.event());
  }
  for (const op of v4.operations()) {
    for (const event of op.events()) {
      out.push(event);
    }
  }
}

export function collectContractEventsFromMeta(
  meta: xdr.TransactionMeta,
): xdr.ContractEvent[] {
  const out: xdr.ContractEvent[] = [];
  const code = meta.switch();
  if (code === TRANSACTION_META_SWITCH_SOROBAN_V3) {
    pushSorobanV3ContractEvents(out, meta);
  }
  if (code === TRANSACTION_META_SWITCH_SOROBAN_V4) {
    pushSorobanV4ContractEvents(out, meta);
  }
  return out;
}

function transferPartyAddressesFromTopics(
  topics: xdr.ScVal[],
): { from: string; to: string } | undefined {
  if (topics.length < MIN_TRANSFER_EVENT_TOPIC_COUNT) {
    return undefined;
  }
  try {
    const fromTopic = topics[1];
    const toTopic = topics[2];
    if (!fromTopic || !toTopic) {
      return undefined;
    }
    return {
      from: Address.fromScVal(fromTopic).toString(),
      to: Address.fromScVal(toTopic).toString(),
    };
  } catch {
    return undefined;
  }
}

function tryParseTransferFromEvent(
  event: xdr.ContractEvent,
  poolContractId: string,
): string | undefined {
  if (event.type().name !== 'contract') {
    return undefined;
  }
  const body = event.body();
  if (body.switch() !== CONTRACT_EVENT_BODY_V0) {
    return undefined;
  }
  const v0 = body.v0();
  const topics = v0.topics();
  if (!Array.isArray(topics) || topics.length < MIN_TRANSFER_EVENT_TOPIC_COUNT) {
    return undefined;
  }
  const eventName = extractSymbolFromScValue(topics[0]!);
  if (!eventName || eventName.toLowerCase() !== 'transfer') {
    return undefined;
  }
  const parties = transferPartyAddressesFromTopics(topics);
  if (!parties) {
    return undefined;
  }
  if (parties.from !== poolContractId && parties.to !== poolContractId) {
    return undefined;
  }
  return extractAmountFromScValue(v0.data());
}

export function tryExtractTransferAmountRawFromMeta(
  meta: xdr.TransactionMeta | undefined,
  poolContractId: string,
): string | undefined {
  if (!meta) {
    return undefined;
  }
  const normalizedPool = poolContractId.trim();
  if (!normalizedPool) {
    return undefined;
  }
  for (const event of collectContractEventsFromMeta(meta)) {
    const amount = tryParseTransferFromEvent(event, normalizedPool);
    if (amount !== undefined) {
      return amount;
    }
  }
  return undefined;
}

function firstInvokeContractFromHostFunction(
  hostFunction: xdr.HostFunction,
): xdr.InvokeContractArgs | undefined {
  if (hostFunction.switch().name !== 'hostFunctionTypeInvokeContract') {
    return undefined;
  }
  return hostFunction.invokeContract();
}

function contractIdFromInvokeHostOperation(op: xdr.Operation): string | undefined {
  const body = op.body();
  if (body.switch().name !== 'invokeHostFunction') {
    return undefined;
  }
  const invoke = body.invokeHostFunctionOp();
  const hostFunction = invoke.hostFunction();
  const invokeContract = firstInvokeContractFromHostFunction(hostFunction);
  if (!invokeContract) {
    return undefined;
  }
  return scAddressToContractString(invokeContract.contractAddress());
}

function operationsFromEnvelope(envelope: xdr.TransactionEnvelope): xdr.Operation[] {
  const kind = envelope.switch().name;
  if (kind === 'envelopeTypeTx') {
    return [...envelope.v1().tx().operations()];
  }
  if (kind === 'envelopeTypeTxV0') {
    return [...envelope.v0().tx().operations()];
  }
  if (kind === 'envelopeTypeTxFeeBump') {
    const inner = envelope.feeBump().tx().innerTx();
    return [...inner.v1().tx().operations()];
  }
  return [];
}

export function extractInvokedPoolContractFromEnvelope(
  envelope: xdr.TransactionEnvelope,
): string | undefined {
  for (const op of operationsFromEnvelope(envelope)) {
    const id = contractIdFromInvokeHostOperation(op);
    if (id) {
      return id;
    }
  }
  return undefined;
}
