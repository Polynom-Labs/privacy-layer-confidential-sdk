import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    platform: 'browser',
    external: ['@auditable/privacy-pool-zk-sdk'],
  },
  {
    entry: ['src/node.ts'],
    outDir: 'dist',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'es2022',
    platform: 'node',
    external: ['@auditable/privacy-pool-zk-sdk'],
  },
  {
    entry: ['src/testing/index.ts'],
    outDir: 'dist/testing',
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'es2022',
    platform: 'browser',
  },
]);
