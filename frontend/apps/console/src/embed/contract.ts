// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The contract between a host application and an embedded ThunderID app.
 *
 * A host imports the app's remote entry at runtime, reads its {@link RemoteManifest} to draw the
 * app's navigation in the host's own sidebar, and calls {@link RemoteModule.mount} to render the app
 * into a node of the host's page under a path the host chooses. This file is the whole integration
 * surface: a host copies it, and every ThunderID app that can be embedded exports the same shape.
 *
 * Nothing is shared between host and app at runtime. Each keeps its own React, router and UI
 * library, so neither side's upgrades block the other.
 */

/** One entry of the app's navigation, which the host renders in its sidebar. */
export interface RemoteNavItem {
  /** A stable identifier, unique within the manifest. */
  id: string;
  /** The label to show. */
  label: string;
  /**
   * The path of the page, relative to the mount path. Pass it to {@link RemoteHandle.navigate}.
   * A group of pages has no path of its own; it has `children`.
   */
  path?: string;
  /** The name of a Lucide icon that stands for the page, for a host that draws icons. */
  icon?: string;
  /** Pages grouped under this entry. */
  children?: RemoteNavItem[];
}

/** A section of the app's navigation, with an optional heading. */
export interface RemoteNavSection {
  /** The heading of the section, if it has one. */
  label?: string;
  items: RemoteNavItem[];
}

/** What the app tells a host about itself before the host mounts it. */
export interface RemoteManifest {
  /** A stable identifier of the app, such as `thunderid-console`. */
  id: string;
  /** The app's display name. */
  title: string;
  /** The app's navigation, in display order. */
  nav: RemoteNavSection[];
}

/** The ThunderID server the embedded app manages, and the client it signs in as. */
export interface RemoteServerConfig {
  /** The server's public URL, such as `https://thunderid.example.com`. */
  serverUrl: string;
  /** The OAuth client the app signs in as, such as `CONSOLE`. */
  clientId: string;
  /** The scopes to request. Defaults to the app's own. */
  scopes?: string[];
}

/**
 * The endpoints of a backend for frontend on the page's origin that signs the app in and proxies
 * its API calls, so no token reaches the browser. {@link backendEndpoints} builds the default set.
 */
export interface RemoteBackendAuth {
  /** Starts sign-in. The app redirects the browser here. */
  signIn: string;
  /** Returns the signed-in user's session, or 401. */
  session: string;
  /** Reports whether the session is still live, for the app's periodic check. */
  checkSession: string;
  /** Refreshes the session's tokens. */
  refresh: string;
  /** Ends the session at the backend and at the identity provider. */
  signOut: string;
  /** Forwards an API call to the ThunderID server with the session's token attached. */
  proxy: string;
  /**
   * Seconds between checks that the session is still live, so a sign-out elsewhere signs the app
   * out promptly. Omit to check only when the page regains focus.
   */
  checkSessionInterval?: number;
}

/**
 * A token the host already holds for the app, for a host without a backend. The host exchanged it
 * for this app (RFC 8693) and keeps it fresh through {@link RemoteHostToken.renew}. The app signs
 * nobody in; it uses this token as its session.
 */
export interface RemoteHostToken {
  accessToken: string;
  /** When the token expires, in milliseconds since the epoch. */
  expiresAt: number;
  /** The scopes the token carries. */
  scopes: string[];
  /** The URL of the issuer that minted the token. */
  issuerUrl: string;
  /** Returns a fresh token before `expiresAt`. */
  renew: () => Promise<{accessToken: string; expiresAt: number}>;
}

/** What the host hands the app when it mounts it. */
export interface MountContext {
  /** The path the app lives under on the host's page, such as `/identity`. */
  basename: string;
  /** The host's current color mode. The host updates it through {@link RemoteHandle.setColorMode}. */
  colorMode: 'light' | 'dark';
  /**
   * The host's theme, as a Material UI / Oxygen UI theme options object, so the app looks like the
   * rest of the page. Omit it to render the app's default theme.
   */
  theme?: object;
  config: RemoteServerConfig;
  /** Sign in through a backend on the page's origin. Set this or `token`, never both. */
  auth?: RemoteBackendAuth;
  /** Use a token the host already holds. Set this or `auth`, never both. */
  token?: RemoteHostToken;
  /**
   * Called with the app's current path, relative to `basename`, whenever it changes, so the host
   * can mark the active item in its sidebar.
   */
  onNavigate?: (path: string) => void;
}

/** What the host gets back from mounting the app. */
export interface RemoteHandle {
  /** Navigates the app to a path from its manifest, relative to the mount path. */
  navigate: (path: string) => void;
  /** Switches the app to the host's new color mode. */
  setColorMode: (mode: 'light' | 'dark') => void;
  /** Removes the app from the page and releases what it holds. */
  unmount: () => void;
}

/** The shape of the app's remote entry module. */
export interface RemoteModule {
  manifest: RemoteManifest;
  mount: (el: HTMLElement, ctx: MountContext) => Promise<RemoteHandle>;
}

/**
 * The default backend endpoints under a mount path, for a host whose backend follows the ThunderID
 * SDK's backend-mode convention.
 */
export function backendEndpoints(basename: string): RemoteBackendAuth {
  const base: string = basename.replace(/\/+$/, '');

  return {
    checkSession: `${base}/auth/checksession`,
    proxy: `${base}/proxy`,
    refresh: `${base}/auth/refresh`,
    session: `${base}/auth/session`,
    signIn: `${base}/auth/signin`,
    signOut: `${base}/auth/signout`,
  };
}
