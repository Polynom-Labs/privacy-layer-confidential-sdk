export class StateJsonPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateJsonPathError';
  }
}

function parseJsonPath(jsonPath: string): string[] {
  const trimmed = jsonPath.trim();
  if (trimmed.length === 0) {
    throw new StateJsonPathError('JSONPath must not be empty.');
  }

  if (trimmed.startsWith('$.')) {
    return trimmed
      .slice(2)
      .split('.')
      .filter((segment) => segment.length > 0);
  }

  if (trimmed.startsWith('$')) {
    const remainder = trimmed.slice(1);
    if (remainder.startsWith('.')) {
      return remainder
        .slice(1)
        .split('.')
        .filter((segment) => segment.length > 0);
    }
    if (remainder.length === 0) {
      return [];
    }
    throw new StateJsonPathError(`Unsupported JSONPath root: ${jsonPath}`);
  }

  return trimmed.split('.').filter((segment) => segment.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRecordProperty(record: Record<string, unknown>, key: string): unknown {
  if (!Object.hasOwn(record, key)) {
    return undefined;
  }
  return Reflect.get(record, key);
}

function writeRecordProperty(
  record: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Reflect.set(record, key, value);
}

function resolveParentSegment(
  current: Record<string, unknown>,
  segment: string,
  createMissing: boolean,
): Record<string, unknown> {
  const next = readRecordProperty(current, segment);
  if (next === undefined) {
    if (!createMissing) {
      throw new StateJsonPathError(`JSONPath segment not found: ${segment}.`);
    }
    const created: Record<string, unknown> = {};
    writeRecordProperty(current, segment, created);
    return created;
  }
  if (!isRecord(next)) {
    throw new StateJsonPathError(`JSONPath container missing at ${segment}.`);
  }
  return next;
}

export function resolveJsonPathParent(
  root: Record<string, unknown>,
  jsonPath: string,
  createMissing: boolean,
): { parent: Record<string, unknown>; key: string } {
  const segments = parseJsonPath(jsonPath);
  if (segments.length === 0) {
    return { parent: root, key: '' };
  }

  let current: Record<string, unknown> = root;
  for (const segment of segments.slice(0, -1)) {
    current = resolveParentSegment(current, segment, createMissing);
  }

  const key = segments.at(-1);
  if (key === undefined) {
    throw new StateJsonPathError(`JSONPath key missing for ${jsonPath}.`);
  }

  if (!isRecord(current)) {
    throw new StateJsonPathError(`JSONPath parent is not a record for ${jsonPath}.`);
  }

  return { parent: current, key };
}

export function getJsonPathValue(
  root: Record<string, unknown>,
  jsonPath: string,
): unknown {
  const segments = parseJsonPath(jsonPath);
  if (segments.length === 0) {
    return root;
  }

  let current: unknown = root;
  for (const segment of segments) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = readRecordProperty(current, segment);
  }

  return current;
}

export function setJsonPathValue(
  root: Record<string, unknown>,
  jsonPath: string,
  value: unknown,
  createMissing: boolean,
): void {
  const { parent, key } = resolveJsonPathParent(root, jsonPath, createMissing);
  writeRecordProperty(parent, key, value);
}

export function cloneStateTree<T extends Record<string, unknown>>(tree: T): T {
  return structuredClone(tree);
}

export function ensureArrayAtPath(
  root: Record<string, unknown>,
  jsonPath: string,
  createMissing: boolean,
): unknown[] {
  const { parent, key } = resolveJsonPathParent(root, jsonPath, createMissing);
  const current = readRecordProperty(parent, key);
  if (current === undefined) {
    if (!createMissing) {
      throw new StateJsonPathError(`Array path not found: ${jsonPath}.`);
    }
    const created: unknown[] = [];
    writeRecordProperty(parent, key, created);
    return created;
  }
  if (!Array.isArray(current)) {
    throw new StateJsonPathError(`JSONPath does not resolve to an array: ${jsonPath}.`);
  }
  return current;
}

export function ensureRecordAtPath(
  root: Record<string, unknown>,
  jsonPath: string,
  createMissing: boolean,
): Record<string, unknown> {
  const { parent, key } = resolveJsonPathParent(root, jsonPath, createMissing);
  const current = readRecordProperty(parent, key);
  if (current === undefined) {
    if (!createMissing) {
      throw new StateJsonPathError(`Record path not found: ${jsonPath}.`);
    }
    const created: Record<string, unknown> = {};
    writeRecordProperty(parent, key, created);
    return created;
  }
  if (!isRecord(current)) {
    throw new StateJsonPathError(`JSONPath does not resolve to a record: ${jsonPath}.`);
  }
  return current;
}
