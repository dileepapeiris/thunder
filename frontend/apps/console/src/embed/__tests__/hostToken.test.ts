// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
  clearSession: vi.fn(),
  initialize: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock('@thunderid/browser', () => ({
  BrowserStorage: {SessionStorage: 'sessionStorage'},
  ThunderIDBrowserClient: class {
    static clearSession = mocks.clearSession;

    initialize = mocks.initialize;

    setSession = mocks.setSession;
  },
}));

import {installHostToken} from '../hostToken';

const config = {clientId: 'CONSOLE', serverUrl: 'https://thunderid.example.com'};

describe('installHostToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
    mocks.initialize.mockResolvedValue(true);
    mocks.setSession.mockResolvedValue(undefined);
    mocks.clearSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('writes the host token as the SDK session, through the SDK client in session storage', async () => {
    const expiresAt = Date.now() + 600_000;

    await installHostToken(config, {
      accessToken: 'abc',
      expiresAt,
      issuerUrl: config.serverUrl,
      renew: vi.fn(),
      scopes: ['openid', 'system'],
    });

    expect(mocks.initialize).toHaveBeenCalledWith({
      baseUrl: config.serverUrl,
      clientId: 'CONSOLE',
      scopes: ['openid', 'system'],
      storage: 'sessionStorage',
    });
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: 'abc',
      created_at: Date.now(),
      expires_in: '600',
      scope: 'openid system',
      token_type: 'Bearer',
    });
  });

  it('asks the host for a fresh token a minute before expiry and writes it', async () => {
    const renew = vi.fn().mockResolvedValue({accessToken: 'next', expiresAt: Date.now() + 1_200_000});

    await installHostToken(config, {
      accessToken: 'abc',
      expiresAt: Date.now() + 600_000,
      issuerUrl: config.serverUrl,
      renew,
      scopes: ['openid'],
    });

    await vi.advanceTimersByTimeAsync(540_000 - 1);
    expect(renew).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(renew).toHaveBeenCalledTimes(1);
    // The fresh token expires 1,200 s after the test began and 540 s have passed.
    expect(mocks.setSession).toHaveBeenLastCalledWith(
      expect.objectContaining({access_token: 'next', expires_in: '660'}),
    );
  });

  it('tries again later when the host fails to renew', async () => {
    const renew = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({accessToken: 'next', expiresAt: Date.now() + 900_000});

    await installHostToken(config, {
      accessToken: 'abc',
      expiresAt: Date.now() + 70_000,
      issuerUrl: config.serverUrl,
      renew,
      scopes: ['openid'],
    });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(renew).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(renew).toHaveBeenCalledTimes(2);
    expect(mocks.setSession).toHaveBeenLastCalledWith(expect.objectContaining({access_token: 'next'}));
  });

  it('stops renewing and clears the session when disposed', async () => {
    const renew = vi.fn().mockResolvedValue({accessToken: 'next', expiresAt: Date.now() + 900_000});

    const dispose = await installHostToken(config, {
      accessToken: 'abc',
      expiresAt: Date.now() + 70_000,
      issuerUrl: config.serverUrl,
      renew,
      scopes: ['openid'],
    });
    dispose();

    await vi.advanceTimersByTimeAsync(100_000);

    expect(renew).not.toHaveBeenCalled();
    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
  });
});
