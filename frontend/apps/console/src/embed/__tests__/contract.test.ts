// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {backendEndpoints} from '../contract';

describe('backendEndpoints', () => {
  it('builds the SDK backend-mode endpoints under the mount path', () => {
    expect(backendEndpoints('/identity')).toEqual({
      checkSession: '/identity/auth/checksession',
      proxy: '/identity/proxy',
      refresh: '/identity/auth/refresh',
      session: '/identity/auth/session',
      signIn: '/identity/auth/signin',
      signOut: '/identity/auth/signout',
    });
  });

  it('drops a trailing slash from the mount path', () => {
    expect(backendEndpoints('/identity/').signIn).toBe('/identity/auth/signin');
  });
});
