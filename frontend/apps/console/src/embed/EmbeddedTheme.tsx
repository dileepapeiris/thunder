// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {DefaultTheme, getCspNonce} from '@thunderid/design';
import {createOxygenTheme, OxygenUIThemeProvider} from '@wso2/oxygen-ui';
import type {Theme} from '@wso2/oxygen-ui';
import {useMemo, type JSX, type ReactNode} from 'react';

export interface EmbeddedThemeProps {
  /** The host's theme options, or `undefined` for the console's default theme. */
  theme: object | undefined;
  children: ReactNode;
}

/**
 * Embedded in a host, the console takes the host's theme so the page has one look, and leaves the
 * document head alone: the host owns the title and the favicon.
 */
export default function EmbeddedTheme({theme, children}: EmbeddedThemeProps): JSX.Element {
  const hostTheme: Theme = useMemo(() => (theme ? createOxygenTheme(theme) : DefaultTheme), [theme]);

  return (
    <OxygenUIThemeProvider nonce={getCspNonce()} theme={hostTheme}>
      {children}
    </OxygenUIThemeProvider>
  );
}
