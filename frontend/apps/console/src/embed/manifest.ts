// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {RemoteManifest, RemoteNavItem} from './contract';
import NAVIGATION, {type NavEntry} from '../configs/NavigationConfig';

const toNavItem = (entry: NavEntry): RemoteNavItem => ({
  id: entry.id,
  label: entry.label,
  icon: entry.iconName,
  ...(entry.path ? {path: entry.path} : {}),
  ...(entry.children ? {children: entry.children.map(toNavItem)} : {}),
});

/**
 * What the console tells a host before the host mounts it. The navigation is the sidebar's own
 * list, so a page added to the console reaches the host's sidebar too. Labels are English: the
 * manifest is read before the console, and its translations, load.
 */
const consoleManifest: RemoteManifest = {
  id: 'thunderid-console',
  title: 'ThunderID Console',
  nav: NAVIGATION.map((section) => ({
    ...(section.heading ? {label: section.heading.label} : {}),
    items: section.entries.map(toNavItem),
  })),
};

export default consoleManifest;
