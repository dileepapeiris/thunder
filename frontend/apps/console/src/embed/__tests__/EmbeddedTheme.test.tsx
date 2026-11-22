// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import EmbeddedTheme from '../EmbeddedTheme';

const mocks = vi.hoisted(() => ({createOxygenTheme: vi.fn(), provider: vi.fn()}));

vi.mock('@thunderid/design', () => ({DefaultTheme: {name: 'default'}, getCspNonce: () => 'nonce'}));
vi.mock('@wso2/oxygen-ui', () => ({
  createOxygenTheme: mocks.createOxygenTheme,
  OxygenUIThemeProvider: ({children, ...props}: {children: React.ReactNode}) => {
    mocks.provider(props);
    return <div data-testid="theme-provider">{children}</div>;
  },
}));

describe('EmbeddedTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createOxygenTheme.mockImplementation((options: object) => ({built: options}));
  });

  it('renders the console with the host theme', () => {
    render(
      <EmbeddedTheme theme={{palette: {primary: {main: '#000'}}}}>
        <span>page</span>
      </EmbeddedTheme>,
    );

    expect(mocks.createOxygenTheme).toHaveBeenCalledWith({palette: {primary: {main: '#000'}}});
    expect(mocks.provider).toHaveBeenCalledWith(
      expect.objectContaining({nonce: 'nonce', theme: {built: {palette: {primary: {main: '#000'}}}}}),
    );
    expect(screen.getByTestId('theme-provider')).toHaveTextContent('page');
  });

  it('falls back to the default theme when the host passes none', () => {
    render(
      <EmbeddedTheme theme={undefined}>
        <span>page</span>
      </EmbeddedTheme>,
    );

    expect(mocks.createOxygenTheme).not.toHaveBeenCalled();
    expect(mocks.provider).toHaveBeenCalledWith(expect.objectContaining({theme: {name: 'default'}}));
  });
});
