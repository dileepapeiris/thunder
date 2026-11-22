// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router';
import {describe, expect, it, vi} from 'vitest';
import type {MountContext} from '../contract';
import {EmbedContext, type EmbedState} from '../EmbedContext';
import EmbedRouterBridge from '../EmbedRouterBridge';

function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

const renderBridge = (state: EmbedState | null) =>
  render(
    <EmbedContext.Provider value={state}>
      <MemoryRouter initialEntries={['/users']}>
        <EmbedRouterBridge />
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>
    </EmbedContext.Provider>,
  );

const context = (onNavigate = vi.fn()): MountContext => ({
  basename: '/identity',
  colorMode: 'light',
  config: {clientId: 'CONSOLE', serverUrl: 'https://thunderid.example.com'},
  onNavigate,
});

describe('EmbedRouterBridge', () => {
  it('renders nothing and does nothing standalone', () => {
    const {container} = renderBridge(null);

    expect(container.querySelector('[data-testid="location"]')).toHaveTextContent('/users');
  });

  it('reports the current path to the host when mounted and on every change', () => {
    const onNavigate = vi.fn();
    const setNavigate = vi.fn();
    renderBridge({colorMode: 'light', ctx: context(onNavigate), setNavigate});

    expect(onNavigate).toHaveBeenLastCalledWith('/users');

    const navigate = setNavigate.mock.calls[0][0] as (path: string) => void;
    act(() => {
      navigate('/groups');
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/groups');
    expect(onNavigate).toHaveBeenLastCalledWith('/groups');
  });

  it('hands the host a navigate function and takes it back on unmount', () => {
    const setNavigate = vi.fn();
    const {unmount} = renderBridge({colorMode: 'light', ctx: context(), setNavigate});

    expect(setNavigate).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    expect(setNavigate).toHaveBeenLastCalledWith(null);
  });

  it('tolerates a host that does not listen for navigation', () => {
    const ctx = context();
    delete ctx.onNavigate;

    expect(() => renderBridge({colorMode: 'light', ctx, setNavigate: vi.fn()})).not.toThrow();
  });
});
