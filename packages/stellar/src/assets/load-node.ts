import type { StellarNodeAssets } from '../types.node.js';

export async function loadNodeAssets(assets: StellarNodeAssets): Promise<{
  sdkWasm: ArrayBuffer;
}> {
  const sdkWasm = await readAssetFile(assets.sdkWasmPath);
  return { sdkWasm };
}

async function readAssetFile(path: string): Promise<ArrayBuffer> {
  const { readFile } = await import('fs/promises');
  const buffer = await readFile(path);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
