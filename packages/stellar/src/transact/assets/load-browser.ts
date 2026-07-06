import type { StellarBrowserAssets } from '../../types.js';

export interface LoadBrowserAssetsInput {
  sdkWasmUrl: string;
  circuitWasmUrl: string;
  provingKeyUrl: string;
  cacheBust?: boolean;
}

export async function loadStellarBrowserAssets(
  input: LoadBrowserAssetsInput,
): Promise<StellarBrowserAssets> {
  const cacheKey = input.cacheBust ? `?v=${Date.now()}` : '';
  const [sdkWasm, circuitWasm, provingKey] = await Promise.all([
    fetch(`${input.sdkWasmUrl}${cacheKey}`).then((response) => response.arrayBuffer()),
    fetch(input.circuitWasmUrl).then((response) => response.arrayBuffer()),
    fetch(input.provingKeyUrl).then((response) => response.arrayBuffer()),
  ]);
  return { sdkWasm, circuitWasm, provingKey };
}

export async function loadDefaultStellarBrowserAssets(options?: {
  cacheBust?: boolean;
}): Promise<StellarBrowserAssets> {
  await import('@auditable/privacy-pool-zk-sdk');
  const sdkWasmUrl = new URL('@auditable/privacy-pool-zk-sdk/sdk.wasm', import.meta.url)
    .href;
  const circuitWasmUrl = new URL(
    '@auditable/privacy-pool-zk-sdk/witness.wasm',
    import.meta.url,
  ).href;
  const provingKeyUrl = new URL(
    '@auditable/privacy-pool-zk-sdk/main.zkey',
    import.meta.url,
  ).href;
  return loadStellarBrowserAssets({
    sdkWasmUrl,
    circuitWasmUrl,
    provingKeyUrl,
    ...(options?.cacheBust ? { cacheBust: true } : {}),
  });
}
