import { describe, expect, it } from 'vitest';

describe('entrypoints', () => {
  it('browser source does not import node filesystem modules', async () => {
    const { readFile } = await import('fs/promises');
    const browserSources = [
      '../src/index.ts',
      '../src/client/create.ts',
      '../src/transact/engine/default-factory.ts',
    ];

    for (const sourcePath of browserSources) {
      const source = await readFile(new URL(sourcePath, import.meta.url), 'utf8');
      expect(source).not.toContain("from 'node:fs");
      expect(source).not.toContain('from "node:fs');
      expect(source).not.toContain("from 'fs/promises'");
    }
  });

  it('browser bundle does not reference node filesystem modules', async () => {
    const { readFile, readdir } = await import('fs/promises');
    const distributionRoot = new URL('../dist/', import.meta.url);
    const entries = await readdir(distributionRoot, { withFileTypes: true });
    const browserArtifacts = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .filter((entry) => entry.name !== 'node.js')
      .map((entry) => entry.name);

    for (const fileName of browserArtifacts) {
      const source = await readFile(new URL(fileName, distributionRoot), 'utf8');
      expect(source).not.toContain('node:fs');
      expect(source).not.toContain('fs/promises');
      expect(source).not.toContain('readFile(');
    }
  });

  it('node entry loads assets from paths', async () => {
    const { loadNodeAssets } = await import('../src/assets/load-node.js');
    const assets = await loadNodeAssets({
      sdkWasmPath: new URL('../test/fixtures/tiny.wasm', import.meta.url).pathname,
    });
    expect(assets.sdkWasm.byteLength).toBeGreaterThan(0);
  });
});
