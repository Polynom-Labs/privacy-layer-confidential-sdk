import type { StellarNodeAssets } from './types.node.js';

export async function loadNodeAssets(assets: StellarNodeAssets): Promise<{
  sdkWasm: ArrayBuffer;
  circuitWasm: ArrayBuffer;
  provingKey: ArrayBuffer;
}> {
  const [sdkWasm, circuitWasm, provingKey] = await Promise.all([
    readAssetFile(assets.sdkWasmPath),
    readAssetFile(assets.circuitWasmPath),
    readAssetFile(assets.provingKeyPath),
  ]);

  return { sdkWasm, circuitWasm, provingKey };
}

async function readAssetFile(path: string): Promise<ArrayBuffer> {
  const { readFile } = await import('node:fs/promises');
  const buffer = await readFile(path);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
