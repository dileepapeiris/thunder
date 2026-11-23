// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useEffect, useMemo, useState, type JSX, type ReactNode} from 'react';
import type {MountContext} from './contract';
import {EmbedContext, type EmbedState} from './EmbedContext';
import EmbedErrorBoundary from './EmbedErrorBoundary';

/** What the mounted console hands back for the host's handle, once it renders. */
export interface EmbedBinding {
  setColorMode: (mode: 'light' | 'dark') => void;
}

export interface EmbedRootProps {
  ctx: MountContext;
  /** Receives the binding when the root renders, and `null` when it goes away. */
  bind: (binding: EmbedBinding | null) => void;
  setNavigate: EmbedState['setNavigate'];
  children: ReactNode;
}

/**
 * The root of the embedded console: holds the host's color mode and publishes the embed state.
 * The color mode is applied with the `data-color-scheme` attribute the console's themes select
 * their variables by, scoped to the console's own subtree so the host's page is untouched.
 */
export default function EmbedRoot({ctx, bind, setNavigate, children}: EmbedRootProps): JSX.Element {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(ctx.colorMode);

  useEffect(() => {
    bind({setColorMode});

    return () => {
      bind(null);
    };
  }, [bind]);

  const state: EmbedState = useMemo(() => ({ctx, colorMode, setNavigate}), [ctx, colorMode, setNavigate]);

  return (
    <EmbedContext.Provider value={state}>
      <div data-color-scheme={colorMode} data-testid="thunderid-embed-root">
        <EmbedErrorBoundary>{children}</EmbedErrorBoundary>
      </div>
    </EmbedContext.Provider>
  );
}
