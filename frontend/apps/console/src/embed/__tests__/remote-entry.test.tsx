// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {MountContext} from '../contract';

const mockRoot = vi.hoisted(() => ({render: vi.fn(), unmount: vi.fn()}));
const mockCreateRoot = vi.hoisted(() => vi.fn(() => mockRoot));
vi.mock('react-dom/client', () => ({createRoot: mockCreateRoot}));

const mockRenderEmbedded = vi.hoisted(() => vi.fn());
vi.mock('../render', () => ({renderEmbedded: mockRenderEmbedded}));

import {manifest, mount, validateMountContext} from '../remote-entry';
import type {EmbedRefs} from '../render';

const baseContext = (): MountContext => ({
  basename: '/identity',
  colorMode: 'light',
  config: {clientId: 'CONSOLE', serverUrl: 'https://thunderid.example.com'},
  auth: {
    checkSession: '/identity/auth/checksession',
    proxy: '/identity/proxy',
    refresh: '/identity/auth/refresh',
    session: '/identity/auth/session',
    signIn: '/identity/auth/signin',
    signOut: '/identity/auth/signout',
  },
});

const hostToken = () => ({
  accessToken: 'token',
  expiresAt: Date.now() + 60_000,
  issuerUrl: 'https://thunderid.example.com',
  renew: vi.fn(),
  scopes: ['openid'],
});

describe('remote entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderEmbedded.mockResolvedValue(undefined);
  });

  it('exports the console manifest', () => {
    expect(manifest.id).toBe('thunderid-console');
    expect(manifest.nav.length).toBeGreaterThan(0);
  });

  describe('validateMountContext', () => {
    it('accepts a backend context', () => {
      expect(() => validateMountContext(baseContext())).not.toThrow();
    });

    it('accepts a host-token context', () => {
      expect(() => validateMountContext({...baseContext(), auth: undefined, token: hostToken()})).not.toThrow();
    });

    it('rejects a context with neither a backend nor a token', () => {
      expect(() => validateMountContext({...baseContext(), auth: undefined})).toThrow(/ctx\.auth.*or ctx\.token/);
    });

    it('rejects a context with both a backend and a token', () => {
      expect(() => validateMountContext({...baseContext(), token: hostToken()})).toThrow(/not both/);
    });

    it('rejects a mount path that is not absolute', () => {
      expect(() => validateMountContext({...baseContext(), basename: 'identity'})).toThrow(/basename/);
    });

    it('rejects a config without the server or the client', () => {
      expect(() => validateMountContext({...baseContext(), config: {clientId: '', serverUrl: 'x'}})).toThrow(
        /serverUrl and clientId/,
      );
    });
  });

  describe('mount', () => {
    it('renders the console into the host node and returns a handle', async () => {
      const el = document.createElement('div');
      const ctx = baseContext();

      const handle = await mount(el, ctx);

      expect(mockCreateRoot).toHaveBeenCalledWith(el);
      expect(mockRenderEmbedded).toHaveBeenCalledWith(mockRoot, ctx, expect.anything());
      expect(typeof handle.navigate).toBe('function');
      expect(typeof handle.setColorMode).toBe('function');
      expect(typeof handle.unmount).toBe('function');
    });

    it('drives the console through the callbacks it registers while rendered', async () => {
      const navigate = vi.fn();
      const setColorMode = vi.fn();
      mockRenderEmbedded.mockImplementation((_root: unknown, _ctx: MountContext, refs: EmbedRefs) => {
        refs.navigateRef.current = navigate;
        refs.colorModeRef.current = setColorMode;
        return Promise.resolve();
      });

      const handle = await mount(document.createElement('div'), baseContext());
      handle.navigate('/users');
      handle.setColorMode('dark');

      expect(navigate).toHaveBeenCalledWith('/users');
      expect(setColorMode).toHaveBeenCalledWith('dark');
    });

    it('ignores navigation and color mode before the console has rendered its router', async () => {
      const handle = await mount(document.createElement('div'), baseContext());

      expect(() => handle.navigate('/users')).not.toThrow();
      expect(() => handle.setColorMode('dark')).not.toThrow();
    });

    it('releases the host token and the React root on unmount', async () => {
      const dispose = vi.fn();
      mockRenderEmbedded.mockImplementation((_root: unknown, _ctx: MountContext, refs: EmbedRefs) => {
        refs.disposeRef.current = dispose;
        return Promise.resolve();
      });

      const handle = await mount(document.createElement('div'), baseContext());
      handle.unmount();

      expect(dispose).toHaveBeenCalledTimes(1);
      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('leaves nothing behind when the console fails to render', async () => {
      const dispose = vi.fn();
      mockRenderEmbedded.mockImplementation((_root: unknown, _ctx: MountContext, refs: EmbedRefs) => {
        refs.disposeRef.current = dispose;
        return Promise.reject(new Error('boom'));
      });

      await expect(mount(document.createElement('div'), baseContext())).rejects.toThrow('boom');

      expect(dispose).toHaveBeenCalledTimes(1);
      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid context before creating a root', async () => {
      await expect(mount(document.createElement('div'), {...baseContext(), auth: undefined})).rejects.toThrow();

      expect(mockCreateRoot).not.toHaveBeenCalled();
    });
  });
});
