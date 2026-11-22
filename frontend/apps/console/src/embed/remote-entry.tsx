// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The console's remote entry: the module a host application imports at runtime to embed the
 * console as a microfrontend. It exports the {@link manifest} and {@link mount}, and nothing else;
 * the console itself loads when the host mounts it. See `contract.ts` for the host contract.
 */

import {createRoot, type Root} from 'react-dom/client';
import type {MountContext, RemoteHandle, RemoteManifest} from './contract';
import consoleManifest from './manifest';
import type {EmbedRefs} from './render';

export type {MountContext, RemoteHandle, RemoteManifest, RemoteModule} from './contract';
export {backendEndpoints} from './contract';

/** What the console tells the host about itself. */
export const manifest: RemoteManifest = consoleManifest;

/**
 * Rejects a mount context the console cannot run with, before anything renders. The host must
 * pick exactly one way to sign the console in, and a mount path the router can use.
 */
export function validateMountContext(ctx: MountContext): void {
  if (!ctx.auth && !ctx.token) {
    throw new Error('ThunderID console: mount(el, ctx) needs ctx.auth (a backend) or ctx.token (a host token).');
  }

  if (ctx.auth && ctx.token) {
    throw new Error('ThunderID console: mount(el, ctx) takes ctx.auth or ctx.token, not both.');
  }

  if (!ctx.basename.startsWith('/')) {
    throw new Error(`ThunderID console: ctx.basename must start with "/", got "${ctx.basename}".`);
  }

  if (!ctx.config.serverUrl || !ctx.config.clientId) {
    throw new Error('ThunderID console: ctx.config needs serverUrl and clientId.');
  }
}

/**
 * Renders the console into `el` under the host's mount path and returns a handle the host drives
 * it through. Rejects, leaving nothing behind, when the context is invalid or the console fails
 * to load.
 */
export async function mount(el: HTMLElement, ctx: MountContext): Promise<RemoteHandle> {
  validateMountContext(ctx);

  const refs: EmbedRefs = {
    colorModeRef: {current: null},
    disposeRef: {current: null},
    navigateRef: {current: null},
  };
  const root: Root = createRoot(el);

  const dispose = (): void => {
    refs.disposeRef.current?.();
    refs.disposeRef.current = null;
    root.unmount();
  };

  try {
    const {renderEmbedded} = await import('./render');
    await renderEmbedded(root, ctx, refs);
  } catch (error: unknown) {
    dispose();
    throw error;
  }

  return {
    navigate: (path: string): void => {
      refs.navigateRef.current?.(path);
    },
    setColorMode: (mode: 'light' | 'dark'): void => {
      refs.colorModeRef.current?.(mode);
    },
    unmount: dispose,
  };
}
