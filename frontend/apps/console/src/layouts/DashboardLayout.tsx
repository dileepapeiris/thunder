// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ForbiddenNotice, getInitials} from '@thunderid/components';
import {useCapabilitiesContext, useConfig} from '@thunderid/contexts';
import {useLogger} from '@thunderid/logger/react';
import {SignOutButton, User, useThunderID} from '@thunderid/react';
import {
  AppShell,
  Box,
  Button,
  ColorSchemeImage,
  ColorSchemeToggle,
  Footer,
  Header,
  Sidebar,
  useAppShell,
  useSidebar,
  UserMenu,
} from '@wso2/oxygen-ui';
import {LogOut, SquareArrowRightEnter} from '@wso2/oxygen-ui-icons-react';
import {useEffect, useMemo, useState, type JSX, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Link as NavigateLink, Outlet, useLocation, useNavigate} from 'react-router';
import NAVIGATION, {type NavEntry} from '../configs/NavigationConfig';
import RouteConfig from '../configs/RouteConfig';
import {useEmbed} from '../embed/EmbedContext';

const ICON_BUTTON_SX = {
  minWidth: 40,
  width: 40,
  height: 40,
  borderRadius: '50%',
  px: 0,
  '& .MuiButton-startIcon': {margin: 0},
} as const;

const FULL_BUTTON_SX = {
  height: 40,
  borderRadius: 40,
  wordBreak: 'keep-all',
  whiteSpace: 'nowrap',
  px: 2,
} as const;

/** A sidebar navigation entry. A leaf has a `path`; a parent has `children`. */
interface NavRoute {
  id: string;
  text: string;
  icon: JSX.Element;
  path?: string;
  /** The catalog resource the page shows; the entry is hidden from admins who can't view it. */
  resource?: string;
  children?: NavRoute[];
}

interface NavCategory {
  category?: string;
  routes: NavRoute[];
}

function SidebarFooterButtons(): ReactNode {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {collapsed} = useSidebar();
  const {can, isLoading} = useCapabilitiesContext();

  if (!isLoading && !can('import', 'create') && !can('export', 'create')) {
    return null;
  }

  const buttonSx = collapsed ? ICON_BUTTON_SX : FULL_BUTTON_SX;

  return (
    <Box
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <Button
        variant="outlined"
        aria-label={t('navigation:pages.importExport', 'Import / Export')}
        startIcon={<SquareArrowRightEnter size={18} />}
        onClick={() => void navigate(RouteConfig.importExport.list())}
        sx={buttonSx}
      >
        {!collapsed && t('navigation:pages.importExport', 'Import / Export')}
      </Button>
    </Box>
  );
}

/**
 * Props interface of {@link DashboardLayout}
 */
export interface DashboardLayoutProps {
  /**
   * Collapses the navigation sidebar to icon-only mode. Set by routes whose
   * pages need the full screen width (e.g. the flow builder canvas).
   */
  collapseSidebar?: boolean;
}

/**
 * Applies a route's sidebar preference to the shell.
 *
 * The preference is applied when it changes rather than being bound to the sidebar,
 * so builder routes still start collapsed while the header toggle stays free to
 * collapse and expand it afterwards.
 */
function SidebarPreference({collapsed}: {collapsed: boolean}): null {
  const {actions} = useAppShell();
  const {collapseSidebar, expandSidebar} = actions;

  useEffect(() => {
    if (collapsed) {
      collapseSidebar();
    } else {
      expandSidebar();
    }
    // Runs on the route's preference only: re-running whenever the shell actions are
    // re-created would undo a manual toggle on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  return null;
}

/**
 * Embedded in a host application, the host draws the top bar, the sidebar and the footer, so only
 * the page content renders here.
 */
function EmbeddedLayout(): ReactNode {
  return (
    <Box component="main" sx={{p: 3, width: '100%'}}>
      <Outlet />
    </Box>
  );
}

export default function DashboardLayout({collapseSidebar = false}: DashboardLayoutProps): ReactNode {
  return useEmbed() ? <EmbeddedLayout /> : <StandaloneLayout collapseSidebar={collapseSidebar} />;
}

function StandaloneLayout({collapseSidebar = false}: DashboardLayoutProps): ReactNode {
  const {clearSession, discovery} = useThunderID();
  const {isTrustedIssuerGenericOidc, getTrustedIssuerClientId, getClientUrl, config} = useConfig();
  const {t} = useTranslation();
  const logger = useLogger();
  // When sign-in runs on a backend (BFF), the backend holds the session and its sign-out endpoint
  // ends it at the IdP, so signOut() must go there instead of the IdP directly.
  const signsOutThroughBackend = Boolean(
    (config.sdk?.endpoints as {backend?: {signOut?: string}} | undefined)?.backend?.signOut,
  );

  const handleSignOut = (signOut: () => Promise<void>): void => {
    if (isTrustedIssuerGenericOidc() && !signsOutThroughBackend) {
      try {
        clearSession();
      } catch (error: unknown) {
        logger.error('Failed to clear local session before IdP sign out', {error});
      }

      const endSessionEndpoint = discovery?.wellKnown?.end_session_endpoint;
      if (!endSessionEndpoint) {
        logger.warn('end_session_endpoint missing from IdP discovery document; ending local session only');
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = getClientUrl();
        return;
      }

      const logoutUrl = new URL(endSessionEndpoint);
      logoutUrl.searchParams.set('client_id', getTrustedIssuerClientId());
      logoutUrl.searchParams.set('post_logout_redirect_uri', getClientUrl());
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = logoutUrl.toString();
      return;
    }

    // Native ThunderID session: signOut() performs OIDC RP-Initiated Logout, the SDK's default
    // behavior (no client config required). It clears the local session and redirects to ThunderID's
    // end_session_endpoint, which confirms the sign-out, terminates the SSO session server-side, and
    // returns to the console. It falls back to a local-only sign out when no end_session_endpoint is
    // advertised.
    signOut().catch((error: unknown) => {
      logger.error('Sign out failed', {error});
    });
  };

  const appRoutes: NavCategory[] = useMemo(() => {
    const toRoute = (entry: NavEntry): NavRoute => ({
      id: entry.id,
      text: t(entry.labelKey, entry.label),
      icon: entry.icon,
      ...(entry.path ? {path: entry.path} : {}),
      ...(entry.resource ? {resource: entry.resource} : {}),
      ...(entry.children ? {children: entry.children.map(toRoute)} : {}),
    });

    return NAVIGATION.map((section) => ({
      ...(section.heading ? {category: t(section.heading.labelKey, section.heading.label)} : {}),
      routes: section.entries.map(toRoute),
    }));
  }, [t]);

  const {can, isLoading: isLoadingCapabilities, error: capabilitiesError} = useCapabilitiesContext();

  // The navigation the admin may see: entries for pages they can't view, and groups left empty, are hidden.
  const visibleRoutes: NavCategory[] = useMemo(() => {
    const isVisible = (route: NavRoute): boolean => isLoadingCapabilities || !route.resource || can(route.resource);
    return appRoutes
      .map((group) => ({
        ...group,
        routes: group.routes
          .map((route) => (route.children ? {...route, children: route.children.filter(isVisible)} : route))
          .filter((route) => (route.children ? route.children.length > 0 : isVisible(route))),
      }))
      .filter((group) => group.routes.length > 0);
  }, [appRoutes, can, isLoadingCapabilities]);

  const {pathname} = useLocation();

  // Resolve the active leaf item by the longest matching path prefix, so nested
  // routes (e.g. /verifiable-credentials/create) still highlight their menu item.
  const activeItem = useMemo((): string | undefined => {
    const leaves = appRoutes.flatMap((group) => group.routes.flatMap((route) => route.children ?? [route]));
    const match = leaves
      .filter(
        (route): route is NavRoute & {path: string} =>
          route.path !== undefined && (pathname === route.path || pathname.startsWith(`${route.path}/`)),
      )
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match?.id;
  }, [appRoutes, pathname]);

  const activeResource = useMemo(
    () =>
      appRoutes
        .flatMap((group) => group.routes.flatMap((route) => route.children ?? [route]))
        .find((route) => route.id === activeItem)?.resource,
    [appRoutes, activeItem],
  );
  // A failed read forbids nothing here: the page stays, and a guarded page offers the retry itself.
  const isPageForbidden =
    !isLoadingCapabilities && !capabilitiesError && activeResource !== undefined && !can(activeResource);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const handleToggleExpand = (id: string): void => {
    setExpandedMenus((prev) => ({...prev, [id]: !prev[id]}));
  };

  // Auto-expand a parent whose child is the active route.
  useEffect(() => {
    appRoutes.forEach((group) => {
      group.routes.forEach((route) => {
        if (route.children?.some((child) => child.id === activeItem)) {
          setExpandedMenus((prev) => (prev[route.id] ? prev : {...prev, [route.id]: true}));
        }
      });
    });
  }, [appRoutes, activeItem]);

  return (
    // `collapseSidebar` seeds AppShell's own state rather than force-controlling the
    // Sidebar. Passing `collapsed` to the Sidebar would override the shell's state and
    // leave the header toggle with nothing to drive.
    <AppShell initialCollapsed={collapseSidebar}>
      <SidebarPreference collapsed={collapseSidebar} />
      <AppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandLogo>
              <ColorSchemeImage
                src={{
                  light: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/assets/images/logo.svg`,
                  dark: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/assets/images/logo-inverted.svg`,
                }}
                alt={{light: 'Logo (Light)', dark: 'Logo (Dark)'}}
                height={27}
                width="auto"
                alignItems="center"
                marginBottom="3px"
              />
            </Header.BrandLogo>
            <Header.BrandTitle>Console</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <User>
              {(user) => {
                const name = String(user?.name ?? '');
                // Two-letter initials when there is no picture, matching the other WSO2 consoles.
                const avatar = typeof user?.picture === 'string' ? user.picture : name ? getInitials(name) : undefined;

                return (
                  <UserMenu>
                    <UserMenu.Trigger name={String(user?.name ?? '')} avatar={avatar} />
                    <UserMenu.Header
                      name={String(user?.name ?? '')}
                      email={String(user?.email ?? '')}
                      avatar={avatar}
                    />
                    <UserMenu.Divider />
                    <SignOutButton>
                      {({signOut}) => (
                        <UserMenu.Logout
                          icon={<LogOut />}
                          label={t('common:actions.signOut', 'Sign out')}
                          onClick={() => handleSignOut(signOut)}
                        />
                      )}
                    </SignOutButton>
                  </UserMenu>
                );
              }}
            </User>
          </Header.Actions>
        </Header>
      </AppShell.Navbar>

      <AppShell.Sidebar>
        <Sidebar activeItem={activeItem} expandedMenus={expandedMenus} onToggleExpand={handleToggleExpand}>
          <Sidebar.Nav>
            {visibleRoutes.map((categoryGroup) => (
              <Sidebar.Category key={categoryGroup.category}>
                {categoryGroup.category && <Sidebar.CategoryLabel>{categoryGroup.category}</Sidebar.CategoryLabel>}
                {categoryGroup.routes.map((route) =>
                  route.children ? (
                    <Sidebar.Item key={route.id} id={route.id}>
                      <Sidebar.ItemIcon>{route.icon}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{route.text}</Sidebar.ItemLabel>
                      {route.children.map((child) => (
                        <Sidebar.Item key={child.id} id={child.id} link={<NavigateLink to={child.path ?? ''} />}>
                          <Sidebar.ItemIcon>{child.icon}</Sidebar.ItemIcon>
                          <Sidebar.ItemLabel>{child.text}</Sidebar.ItemLabel>
                        </Sidebar.Item>
                      ))}
                    </Sidebar.Item>
                  ) : (
                    <Sidebar.Item key={route.id} id={route.id} link={<NavigateLink to={route.path ?? ''} />}>
                      <Sidebar.ItemIcon>{route.icon}</Sidebar.ItemIcon>
                      <Sidebar.ItemLabel>{route.text}</Sidebar.ItemLabel>
                    </Sidebar.Item>
                  ),
                )}
              </Sidebar.Category>
            ))}
          </Sidebar.Nav>
          <Sidebar.Footer>
            <SidebarFooterButtons />
          </Sidebar.Footer>
        </Sidebar>
      </AppShell.Sidebar>

      <AppShell.Main>{isPageForbidden ? <ForbiddenNotice /> : <Outlet />}</AppShell.Main>

      <AppShell.Footer>
        <Footer>
          <Footer.Copyright>© {new Date().getFullYear()} The ThunderID Authors</Footer.Copyright>
          <Footer.Divider />
          <Footer.Version>{`${VERSION}`}</Footer.Version>
        </Footer>
      </AppShell.Footer>
    </AppShell>
  );
}
