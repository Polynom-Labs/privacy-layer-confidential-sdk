import type { StellarBrowserAssets } from '../../types.js';

export interface LoadBrowserAssetsInput {
  sdkWasmUrl: string;
  cacheBust?: boolean;
}

export async function loadStellarBrowserAssets(
  input: LoadBrowserAssetsInput,
): Promise<StellarBrowserAssets> {
  const cacheKey = input.cacheBust ? `?v=${Date.now()}` : '';
  const sdkWasm = await fetch(`${input.sdkWasmUrl}${cacheKey}`).then((response) =>
    response.arrayBuffer(),
  );
  return { sdkWasm };
}

export async function loadDefaultStellarBrowserAssets(options?: {
  cacheBust?: boolean;
}): Promise<StellarBrowserAssets> {
  await import('@arcanetech/stellar-privacy-pool-zk-sdk');
  const sdkWasmUrl = new URL('@arcanetech/stellar-privacy-pool-zk-sdk/sdk.wasm', import.meta.url)
    .href;
  return loadStellarBrowserAssets({
    sdkWasmUrl,
    ...(options?.cacheBust ? { cacheBust: true } : {}),
  });
}
