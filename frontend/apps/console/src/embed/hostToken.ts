// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BrowserStorage, ThunderIDBrowserClient} from '@thunderid/browser';
import type {RemoteHostToken, RemoteServerConfig} from './contract';

/** How long before the token expires the host is asked for a fresh one. */
const RENEW_MARGIN_MS = 60_000;
/** The shortest wait before asking the host for a fresh token, so a near-expired one is not spun on. */
const MIN_RENEW_DELAY_MS = 5_000;
/** How long to wait before asking again after the host fails to renew. */
const RETRY_DELAY_MS = 30_000;

const openSeedClient = async (config: RemoteServerConfig, scopes: string[]): Promise<ThunderIDBrowserClient> => {
  const client: ThunderIDBrowserClient = new ThunderIDBrowserClient();
  await client.initialize({
    baseUrl: config.serverUrl,
    clientId: config.clientId,
    scopes,
    storage: BrowserStorage.SessionStorage,
  });

  return client;
};

const writeSession = async (
  client: ThunderIDBrowserClient,
  accessToken: string,
  expiresAt: number,
  scopes: string[],
): Promise<void> => {
  const now: number = Date.now();

  await client.setSession({
    access_token: accessToken,
    created_at: now,
    expires_in: String(Math.max(1, Math.round((expiresAt - now) / 1000))),
    scope: scopes.join(' '),
    token_type: 'Bearer',
  });
};

/**
 * Makes a token the host holds the console's session. The token is written where the SDK keeps
 * its session, through the SDK's own client so the storage keys match, and replaced from the
 * host's `renew()` before it expires. Returns a function that stops the renewal and clears the
 * session; the console calls it when it unmounts.
 */
export async function installHostToken(config: RemoteServerConfig, token: RemoteHostToken): Promise<() => void> {
  const client: ThunderIDBrowserClient = await openSeedClient(config, token.scopes);
  await writeSession(client, token.accessToken, token.expiresAt, token.scopes);

  let timer = 0;
  let disposed = false;

  const scheduleRenewal = (delay: number): void => {
    timer = window.setTimeout(() => {
      if (disposed) {
        return;
      }

      token
        .renew()
        .then(async (next: {accessToken: string; expiresAt: number}) => {
          if (disposed) {
            return;
          }

          await writeSession(client, next.accessToken, next.expiresAt, token.scopes);
          scheduleRenewal(Math.max(MIN_RENEW_DELAY_MS, next.expiresAt - RENEW_MARGIN_MS - Date.now()));
        })
        .catch(() => {
          if (!disposed) {
            scheduleRenewal(RETRY_DELAY_MS);
          }
        });
    }, delay);
  };

  scheduleRenewal(Math.max(MIN_RENEW_DELAY_MS, token.expiresAt - RENEW_MARGIN_MS - Date.now()));

  return () => {
    disposed = true;
    window.clearTimeout(timer);
    void ThunderIDBrowserClient.clearSession();
  };
}
