// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Builds the console as a remote: an ES module, `remote-entry.js`, that a host application
 * imports at runtime and mounts into its own page without an iframe. The entry is
 * `src/embed/remote-entry.tsx` and the host contract is `src/embed/contract.ts`.
 *
 * The output is served from the console's own origin under `/remotes/thunderid/` (override with
 * `REMOTE_BASE`), which the host's ingress routes to this build. Run it with `pnpm build:remote`.
 */

import {dirname, resolve} from 'path';
import {fileURLToPath} from 'url';
import {mergeConfig, type UserConfig} from 'vite';
import baseConfig from './vite.config';

const currentDir = dirname(fileURLToPath(import.meta.url));
const REMOTE_BASE = process.env.REMOTE_BASE ?? '/remotes/thunderid/';
const PORT = process.env.PORT ? Number(process.env.PORT) : 5301;

const base: UserConfig =
  typeof baseConfig === 'function' ? baseConfig({command: 'build', mode: 'production'}) : baseConfig;

export default mergeConfig(base, {
  base: REMOTE_BASE,
  build: {
    emptyOutDir: true,
    outDir: resolve(currentDir, 'dist-remote'),
    rollupOptions: {
      input: {'remote-entry': resolve(currentDir, 'src/embed/remote-entry.tsx')},
      output: {entryFileNames: '[name].js', format: 'es'},
      preserveEntrySignatures: 'exports-only',
    },
    sourcemap: true,
  },
  // `vite preview --config vite.config.remote.ts` serves the remote to a host on another port.
  preview: {cors: true, port: PORT, strictPort: true},
} satisfies UserConfig);
