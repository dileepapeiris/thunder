// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, screen} from '@testing-library/react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {MountContext} from '../contract';
import {useEmbed} from '../EmbedContext';
import {buildRuntimeConfig, renderEmbedded, type EmbedRefs} from '../render';

const mockDispose = vi.hoisted(() => vi.fn());
const mockInstallHostToken = vi.hoisted(() => vi.fn());
vi.mock('../hostToken', () => ({installHostToken: mockInstallHostToken}));

function MockApp() {
  const embed = useEmbed();
  return (
    <div data-testid="app" data-basename={embed?.ctx.basename} data-color-mode={embed?.colorMode}>
      <button type="button" onClick={() => embed?.setNavigate((path) => path)}>
        register
      </button>
    </div>
  );
}

vi.mock('../../AppWithDecorators', () => ({default: MockApp}));

const backendContext = (): MountContext => ({
  basename: '/identity',
  colorMode: 'light',
  config: {clientId: 'CONSOLE', serverUrl: 'https://thunderid.example.com/'},
  auth: {
    checkSession: '/identity/auth/checksession',
    checkSessionInterval: 30,
    proxy: '/identity/proxy',
    refresh: '/identity/auth/refresh',
    session: '/identity/auth/session',
    signIn: '/identity/auth/signin',
    signOut: '/identity/auth/signout',
  },
});

const tokenContext = (): MountContext => ({
  basename: '/identity',
  colorMode: 'dark',
  config: {clientId: 'CONSOLE', serverUrl: 'https://thunderid.example.com'},
  token: {
    accessToken: 'token',
    expiresAt: Date.now() + 60_000,
    issuerUrl: 'http://issuer.example.com:8090',
    renew: vi.fn(),
    scopes: ['openid', 'system'],
  },
});

const newRefs = (): EmbedRefs => ({
  colorModeRef: {current: null},
  disposeRef: {current: null},
  navigateRef: {current: null},
});

describe('buildRuntimeConfig', () => {
  it('marks the console embedded under the host mount path and points it at the server', () => {
    const config = buildRuntimeConfig(backendContext());

    expect(config.client).toEqual({
      base: '/identity',
      client_id: 'CONSOLE',
      embedded: true,
      scopes: ['openid', 'profile', 'email'],
    });
    expect(config.server).toEqual({public_url: 'https://thunderid.example.com/'});
    expect(config.trusted_issuer).toBeUndefined();
  });

  it('hands the host backend to the SDK as backend mode, with the session check interval', () => {
    const config = buildRuntimeConfig(backendContext());

    expect(config.sdk).toEqual({
      endpoints: {
        backend: {
          checkSession: '/identity/auth/checksession',
          proxy: '/identity/proxy',
          refresh: '/identity/auth/refresh',
          session: '/identity/auth/session',
          signIn: '/identity/auth/signin',
          signOut: '/identity/auth/signout',
        },
      },
      session: {checkInterval: 30},
    });
  });

  it('omits the session check when the host sets no interval', () => {
    const ctx = backendContext();
    delete ctx.auth?.checkSessionInterval;

    expect(buildRuntimeConfig(ctx).sdk).not.toHaveProperty('session');
  });

  it('uses the host scopes when given', () => {
    expect(
      buildRuntimeConfig({
        ...backendContext(),
        config: {clientId: 'C', scopes: ['openid', 'system'], serverUrl: 'https://s'},
      }).client.scopes,
    ).toEqual(['openid', 'system']);
  });

  it('runs a host token as a trusted-issuer session read from session storage', () => {
    const config = buildRuntimeConfig(tokenContext());

    expect(config.client.scopes).toEqual(['openid', 'system']);
    expect(config.trusted_issuer).toEqual({
      client_id: 'CONSOLE',
      hostname: 'issuer.example.com',
      http_only: true,
      port: 8090,
      public_url: 'http://issuer.example.com:8090',
      scopes: ['openid', 'system'],
    });
    expect(config.sdk).toEqual({storage: 'sessionStorage'});
  });

  it('defaults the issuer port from its scheme', () => {
    const ctx = tokenContext();
    ctx.token!.issuerUrl = 'https://issuer.example.com';

    expect(buildRuntimeConfig(ctx).trusted_issuer?.port).toBe(443);
    expect(buildRuntimeConfig(ctx).trusted_issuer?.http_only).toBe(false);
  });
});

describe('renderEmbedded', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInstallHostToken.mockResolvedValue(mockDispose);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    delete window.__THUNDERID_RUNTIME_CONFIG__;
  });

  it('publishes the runtime config and renders the console under the host mount path', async () => {
    const refs = newRefs();

    await act(async () => {
      await renderEmbedded(root, backendContext(), refs);
    });

    expect(window.__THUNDERID_RUNTIME_CONFIG__?.client.embedded).toBe(true);
    expect(screen.getByTestId('app')).toHaveAttribute('data-basename', '/identity');
    expect(mockInstallHostToken).not.toHaveBeenCalled();
  });

  it('applies the host color mode to the console subtree and follows the host when it changes', async () => {
    const refs = newRefs();

    await act(async () => {
      await renderEmbedded(root, backendContext(), refs);
    });
    expect(screen.getByTestId('thunderid-embed-root')).toHaveAttribute('data-color-scheme', 'light');

    act(() => {
      refs.colorModeRef.current?.('dark');
    });

    expect(screen.getByTestId('thunderid-embed-root')).toHaveAttribute('data-color-scheme', 'dark');
    expect(screen.getByTestId('app')).toHaveAttribute('data-color-mode', 'dark');
  });

  it('records the navigate function the router registers', async () => {
    const refs = newRefs();

    await act(async () => {
      await renderEmbedded(root, backendContext(), refs);
    });
    act(() => {
      screen.getByRole('button', {name: 'register'}).click();
    });

    expect(refs.navigateRef.current?.('/users')).toBe('/users');
  });

  it('installs the host token before rendering and keeps its disposer for unmount', async () => {
    const refs = newRefs();
    const ctx = tokenContext();

    await act(async () => {
      await renderEmbedded(root, ctx, refs);
    });

    expect(mockInstallHostToken).toHaveBeenCalledWith(ctx.config, ctx.token);
    expect(refs.disposeRef.current).toBe(mockDispose);
  });
});
