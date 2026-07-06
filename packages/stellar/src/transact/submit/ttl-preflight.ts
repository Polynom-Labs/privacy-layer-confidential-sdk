type UnknownRecord = Record<string, unknown>;

function getNested(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const key of path) {
    if (typeof cursor !== 'object' || cursor === null) {
      return undefined;
    }
    cursor = (cursor as UnknownRecord)[key];
  }
  return cursor;
}

function needsRestore(simulation: unknown): boolean {
  const restorePreamble =
    getNested(simulation, ['restorePreamble']) ??
    getNested(simulation, ['result', 'restorePreamble']) ??
    getNested(simulation, ['simulation', 'restorePreamble']);
  if (restorePreamble && typeof restorePreamble === 'object') {
    return true;
  }
  const isSimulationError = getNested(simulation, ['error']);
  if (typeof isSimulationError === 'string') {
    return isSimulationError.toLowerCase().includes('restore');
  }
  return false;
}

async function maybeCallFunction(
  target: unknown,
  methodName: string,
): Promise<unknown | undefined> {
  if (typeof target !== 'object' || target === null) {
    return undefined;
  }
  const method = (target as UnknownRecord)[methodName];
  if (typeof method !== 'function') {
    return undefined;
  }
  return (method as () => Promise<unknown>)();
}

export async function runTtlPreflight(assembledTransaction: unknown): Promise<void> {
  const simulation = await maybeCallFunction(assembledTransaction, 'simulate');
  if (!simulation || !needsRestore(simulation)) {
    return;
  }
  const restoreResult =
    (await maybeCallFunction(assembledTransaction, 'restoreFootprint')) ??
    (await maybeCallFunction(assembledTransaction, 'restore'));
  if (!restoreResult) {
    return;
  }
  await maybeCallFunction(assembledTransaction, 'simulate');
}
