// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {createContext, useContext} from 'react';
import type {MountContext} from './contract';

/** What the console knows about the host it runs inside. */
export interface EmbedState {
  ctx: MountContext;
  /** The host's current color mode. Starts as `ctx.colorMode`; the host changes it through its handle. */
  colorMode: 'light' | 'dark';
  /**
   * Hands the host a way to navigate the console. The router bridge calls it with the router's
   * navigate function once the router exists, and with `null` when the router goes away.
   */
  setNavigate: (navigate: ((path: string) => void) | null) => void;
}

/** Present only while the console runs inside a host application. */
export const EmbedContext = createContext<EmbedState | null>(null);

/** The host the console runs inside, or `null` when it runs standalone. */
export const useEmbed = (): EmbedState | null => useContext(EmbedContext);
