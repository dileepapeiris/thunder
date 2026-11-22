// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import type {ProductConfig} from '@thunderid/contexts';
import type {Root} from 'react-dom/client';
import type {MountContext} from './contract';
import EmbedRoot, {type EmbedBinding} from './EmbedRoot';
import {installHostToken} from './hostToken';

/** The product name the console brands itself with when a host embeds it. */
const PRODUCT_NAME = 'ThunderID';

const DEFAULT_SCOPES: string[] = ['openid', 'profile', 'email'];

/** Where the mounted console keeps the callbacks its handle to the host calls. */
export interface EmbedRefs {
  navigateRef: {current: ((path: string) => void) | null};
  colorModeRef: {current: ((mode: 'light' | 'dark') => void) | null};
  disposeRef: {current: (() => void) | null};
}

const toUrl = (value: string): URL => new URL(value);

/**
 * The runtime configuration the console reads when a host mounts it, built from what the host
 * handed over. Sign-in through the host's backend and the host's token both go to the SDK through
 * `sdk`, which the config HOC merges on top of its defaults.
 */
export function buildRuntimeConfig(ctx: MountContext): ProductConfig {
  const scopes: string[] = ctx.token?.scopes ?? ctx.config.scopes ?? DEFAULT_SCOPES;
  const issuer: URL | undefined = ctx.token ? toUrl(ctx.token.issuerUrl) : undefined;

  return {
    brand: {
      product_name: PRODUCT_NAME,
      // The host owns the document, so the console never writes a favicon.
      favicon: {light: '', dark: ''},
    },
    client: {
      base: ctx.basename,
      client_id: ctx.config.clientId,
      embedded: true,
      scopes,
    },
    server: {public_url: ctx.config.serverUrl},
    ...(issuer && ctx.token
      ? {
          trusted_issuer: {
            client_id: ctx.config.clientId,
            hostname: issuer.hostname,
            http_only: issuer.protocol === 'http:',
            port: Number(issuer.port || (issuer.protocol === 'https:' ? 443 : 80)),
            public_url: ctx.token.issuerUrl,
            scopes,
          },
        }
      : {}),
    sdk: {
      ...(ctx.auth
        ? {
            endpoints: {
              backend: {
                checkSession: ctx.auth.checkSession,
                proxy: ctx.auth.proxy,
                refresh: ctx.auth.refresh,
                session: ctx.auth.session,
                signIn: ctx.auth.signIn,
                signOut: ctx.auth.signOut,
              },
            },
            ...(ctx.auth.checkSessionInterval ? {session: {checkInterval: ctx.auth.checkSessionInterval}} : {}),
          }
        : {}),
      // The host's token is seeded into session storage, so the SDK must read its session there.
      ...(ctx.token ? {storage: 'sessionStorage'} : {}),
    },
  };
}

/**
 * Renders the console into a host's React root. The console's modules load here, after the host
 * has read the manifest, so importing the remote entry stays cheap.
 */
export async function renderEmbedded(root: Root, ctx: MountContext, refs: EmbedRefs): Promise<void> {
  window.__THUNDERID_RUNTIME_CONFIG__ = buildRuntimeConfig(ctx);

  if (ctx.token) {
    refs.disposeRef.current = await installHostToken(ctx.config, ctx.token);
  }

  const [{ConfigProvider}, {LoggerProvider, LogLevel}, {setCnPrefix}, {default: AppWithDecorators}] = await Promise.all(
    [
      import('@thunderid/contexts'),
      import('@thunderid/logger/react'),
      import('@thunderid/utils'),
      import('../AppWithDecorators'),
    ],
  );

  setCnPrefix(PRODUCT_NAME);

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount: number, error: unknown): boolean => {
          const status: number | undefined = (error as {response?: {status?: number}})?.response?.status;
          if (status && status >= 400 && status < 500) {
            return false;
          }

          return failureCount < 3;
        },
      },
    },
  });

  const bind = (binding: EmbedBinding | null): void => {
    refs.colorModeRef.current = binding?.setColorMode ?? null;
  };
  const setNavigate = (navigate: ((path: string) => void) | null): void => {
    refs.navigateRef.current = navigate;
  };

  root.render(
    <EmbedRoot ctx={ctx} bind={bind} setNavigate={setNavigate}>
      <ConfigProvider>
        <LoggerProvider logger={{level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO}}>
          <QueryClientProvider client={queryClient}>
            <AppWithDecorators />
          </QueryClientProvider>
        </LoggerProvider>
      </ConfigProvider>
    </EmbedRoot>,
  );
}
