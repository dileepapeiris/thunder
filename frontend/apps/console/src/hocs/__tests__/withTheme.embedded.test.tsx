// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {EmbedContext} from '../../embed/EmbedContext';
import withTheme from '../withTheme';

vi.mock('@thunderid/contexts', () => ({useConfig: () => ({config: {brand: {}}})}));
vi.mock('../../components/Head', () => ({default: () => <div data-testid="head" />}));
vi.mock('../../embed/EmbeddedTheme', () => ({
  default: ({theme, children}: {theme?: object; children: React.ReactNode}) => (
    <div data-testid="embedded-theme" data-theme={JSON.stringify(theme)}>
      {children}
    </div>
  ),
}));
vi.mock('@wso2/oxygen-ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@wso2/oxygen-ui')>()),
  createOxygenTheme: (theme: unknown) => theme,
  HighContrastTheme: {},
  OxygenUIThemeProvider: ({children}: {children: React.ReactNode}) => (
    <div data-testid="standalone-theme">{children}</div>
  ),
}));

const Themed = withTheme(() => <span>page</span>);

describe('withTheme when embedded', () => {
  it('renders with the host theme and leaves the document head to the host', () => {
    render(
      <EmbedContext.Provider
        value={{
          colorMode: 'light',
          ctx: {
            basename: '/identity',
            colorMode: 'light',
            config: {clientId: 'C', serverUrl: 'https://s'},
            theme: {spacing: 4},
          },
          setNavigate: vi.fn(),
        }}
      >
        <Themed />
      </EmbedContext.Provider>,
    );

    expect(screen.getByTestId('embedded-theme')).toHaveAttribute('data-theme', '{"spacing":4}');
    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.queryByTestId('head')).not.toBeInTheDocument();
    expect(screen.queryByTestId('standalone-theme')).not.toBeInTheDocument();
  });

  it('keeps the standalone theme switcher and head outside a host', () => {
    render(<Themed />);

    expect(screen.getByTestId('standalone-theme')).toBeInTheDocument();
    expect(screen.getByTestId('head')).toBeInTheDocument();
  });
});
