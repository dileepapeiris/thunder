// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BotCogIcon} from '@thunderid/components';
import {
  Bot,
  Building,
  Group,
  Home,
  IdCard,
  Languages,
  Layers,
  LayoutGrid,
  ListChecks,
  Mail,
  MessageSquare,
  Palette,
  Server,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  Wallet,
  Workflow,
} from '@wso2/oxygen-ui-icons-react';
import type {JSX} from 'react';
import RouteConfig from './RouteConfig';

/**
 * A page in the console's navigation. A leaf has a `path`; a group has `children`.
 */
export interface NavEntry {
  /** A stable identifier, unique across the navigation. */
  id: string;
  /** The translation key of the label. */
  labelKey: string;
  /** The English label, used when no translation is loaded and for hosts that embed the console. */
  label: string;
  /** The icon drawn next to the label. */
  icon: JSX.Element;
  /** The Lucide name of that icon, for a host that draws its own. */
  iconName: string;
  path?: string;
  /** The catalog resource the page shows; the entry is hidden from admins who can't view it. */
  resource?: string;
  children?: NavEntry[];
}

/** A section of the navigation, with an optional heading. */
export interface NavSection {
  id: string;
  /** The heading, with its translation key and its English text. */
  heading?: {labelKey: string; label: string};
  entries: NavEntry[];
}

/**
 * The console's navigation, in display order. The sidebar draws it translated, and the manifest the
 * console exposes to a host that embeds it is derived from the same list, so the two never drift.
 */
const NAVIGATION: NavSection[] = [
  {
    id: 'overview',
    entries: [
      {
        id: 'home',
        labelKey: 'navigation:pages.home',
        label: 'Home',
        icon: <Home />,
        iconName: 'House',
        path: RouteConfig.home.list(),
      },
    ],
  },
  {
    id: 'resources',
    heading: {labelKey: 'navigation:categories.resources', label: 'Resources'},
    entries: [
      {
        id: 'applications',
        resource: 'app',
        labelKey: 'navigation:pages.applications',
        label: 'Applications',
        icon: <LayoutGrid />,
        iconName: 'LayoutGrid',
        path: RouteConfig.applications.list(),
      },
      {
        id: 'resource-servers',
        resource: 'rs',
        labelKey: 'navigation:pages.resourceServers',
        label: 'Resource servers',
        icon: <Server />,
        iconName: 'Server',
        path: RouteConfig.resourceServers.list(),
      },
      {
        id: 'authorization-detail-types',
        resource: 'authzdetail',
        labelKey: 'navigation:pages.authorizationDetailTypes',
        label: 'Intents',
        icon: <ListChecks />,
        iconName: 'ListChecks',
        path: RouteConfig.authorizationDetailTypes.list(),
      },
    ],
  },
  {
    id: 'identities',
    heading: {labelKey: 'navigation:categories.identities', label: 'Identities'},
    entries: [
      {
        id: 'users',
        resource: 'user',
        labelKey: 'navigation:pages.users',
        label: 'Users',
        icon: <UsersRound />,
        iconName: 'UsersRound',
        path: RouteConfig.users.list(),
      },
      {
        id: 'agents',
        resource: 'agent',
        labelKey: 'navigation:pages.agents',
        label: 'Agents',
        icon: <Bot />,
        iconName: 'Bot',
        path: RouteConfig.agents.list(),
      },
      {
        id: 'groups',
        resource: 'group',
        labelKey: 'navigation:pages.groups',
        label: 'Groups',
        icon: <Group />,
        iconName: 'Group',
        path: RouteConfig.groups.list(),
      },
      {
        id: 'roles',
        resource: 'role',
        labelKey: 'navigation:pages.roles',
        label: 'Roles',
        icon: <ShieldCheck />,
        iconName: 'ShieldCheck',
        path: RouteConfig.roles.list(),
      },
      {
        id: 'user-types',
        resource: 'usertype',
        labelKey: 'navigation:pages.userTypes',
        label: 'User types',
        icon: <UserRoundCog />,
        iconName: 'UserRoundCog',
        path: RouteConfig.userTypes.list(),
      },
      {
        id: 'agent-types',
        resource: 'agenttype',
        labelKey: 'navigation:pages.agentTypes',
        label: 'Agent types',
        icon: <BotCogIcon />,
        iconName: 'BotCog',
        path: RouteConfig.agentTypes.list(),
      },
    ],
  },
  {
    id: 'configure',
    heading: {labelKey: 'navigation:categories.configure', label: 'Configure'},
    entries: [
      {
        id: 'organization-units',
        resource: 'ou',
        labelKey: 'navigation:pages.organizationUnits',
        label: 'Organization units',
        icon: <Building />,
        iconName: 'Building',
        path: RouteConfig.organizationUnits.list(),
      },
      {
        id: 'flows',
        resource: 'flow',
        labelKey: 'navigation:pages.flows',
        label: 'Flows',
        icon: <Workflow />,
        iconName: 'Workflow',
        path: RouteConfig.flows.list(),
      },
      {
        id: 'connections',
        resource: 'connection',
        labelKey: 'navigation:pages.connections',
        label: 'Connections',
        icon: <Layers />,
        iconName: 'Layers',
        path: RouteConfig.connections.list(),
      },
      {
        id: 'verifiable-credentials',
        labelKey: 'navigation:pages.verifiableCredentials',
        label: 'Verifiable credentials',
        icon: <Wallet />,
        iconName: 'Wallet',
        children: [
          {
            id: 'credentials',
            resource: 'vc',
            labelKey: 'navigation:pages.credentials',
            label: 'Credentials',
            icon: <IdCard />,
            iconName: 'IdCard',
            path: RouteConfig.verifiableCredentials.list(),
          },
          {
            id: 'presentations',
            resource: 'vc',
            labelKey: 'navigation:pages.presentations',
            label: 'Presentations',
            icon: <ShieldCheck />,
            iconName: 'ShieldCheck',
            path: RouteConfig.verifiablePresentations.list(),
          },
        ],
      },
    ],
  },
  {
    id: 'customize',
    heading: {labelKey: 'navigation:categories.customize', label: 'Customize'},
    entries: [
      {
        id: 'design',
        resource: 'design',
        labelKey: 'navigation:pages.design',
        label: 'Design',
        icon: <Palette />,
        iconName: 'Palette',
        path: RouteConfig.design.list(),
      },
      {
        id: 'notifications',
        labelKey: 'navigation:pages.notifications',
        label: 'Notifications',
        icon: <Mail />,
        iconName: 'Mail',
        children: [
          {
            id: 'email-templates',
            resource: 'notificationtemplate',
            labelKey: 'navigation:pages.emailTemplates',
            label: 'Email templates',
            icon: <Mail />,
            iconName: 'Mail',
            path: RouteConfig.notificationTemplates.channel('email'),
          },
          {
            id: 'sms-templates',
            resource: 'notificationtemplate',
            labelKey: 'navigation:pages.smsTemplates',
            label: 'SMS templates',
            icon: <MessageSquare />,
            iconName: 'MessageSquare',
            path: RouteConfig.notificationTemplates.channel('sms'),
          },
        ],
      },
      {
        id: 'translations',
        resource: 'i18n',
        labelKey: 'navigation:pages.translations',
        label: 'Translations',
        icon: <Languages />,
        iconName: 'Languages',
        path: RouteConfig.translations.list(),
      },
    ],
  },
  {
    id: 'system',
    heading: {labelKey: 'navigation:categories.system', label: 'System'},
    entries: [
      {
        id: 'settings',
        resource: 'serverconfig',
        labelKey: 'navigation:pages.settings',
        label: 'Settings',
        icon: <Settings />,
        iconName: 'Settings',
        path: RouteConfig.settings.list(),
      },
    ],
  },
];

export default NAVIGATION;
