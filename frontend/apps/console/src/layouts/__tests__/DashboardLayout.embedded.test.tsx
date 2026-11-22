// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {EmbedContext} from '../../embed/EmbedContext';
import DashboardLayout from '../DashboardLayout';

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  Outlet: () => <div data-testid="outlet">Page</div>,
}));

describe('DashboardLayout when embedded', () => {
  it('renders only the page: the host draws the header, sidebar and footer', () => {
    render(
      <EmbedContext.Provider
        value={{
          colorMode: 'light',
          ctx: {basename: '/identity', colorMode: 'light', config: {clientId: 'C', serverUrl: 'https://s'}},
          setNavigate: vi.fn(),
        }}
      >
        <DashboardLayout />
      </EmbedContext.Provider>,
    );

    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('outlet'));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('navigation:pages.users')).not.toBeInTheDocument();
    expect(screen.queryByText('Console')).not.toBeInTheDocument();
  });
});
