// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import NAVIGATION, {type NavEntry} from '../../configs/NavigationConfig';
import type {RemoteNavItem} from '../contract';
import manifest from '../manifest';

const flatten = <T extends {children?: T[]}>(items: T[]): T[] =>
  items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

describe('console manifest', () => {
  it('identifies the console', () => {
    expect(manifest.id).toBe('thunderid-console');
    expect(manifest.title).toBe('ThunderID Console');
  });

  it('mirrors every sidebar section and entry, so the host sidebar never drifts from the console', () => {
    expect(manifest.nav).toHaveLength(NAVIGATION.length);

    NAVIGATION.forEach((section, index) => {
      const remote = manifest.nav[index];
      expect(remote.label).toBe(section.heading?.label);

      const entries: NavEntry[] = flatten(section.entries);
      const items: RemoteNavItem[] = flatten(remote.items);
      expect(items.map((item) => item.id)).toEqual(entries.map((entry) => entry.id));
      expect(items.map((item) => item.path)).toEqual(entries.map((entry) => entry.path));
      expect(items.map((item) => item.label)).toEqual(entries.map((entry) => entry.label));
      expect(items.map((item) => item.icon)).toEqual(entries.map((entry) => entry.iconName));
    });
  });

  it('gives every leaf a path relative to the mount point and every group children', () => {
    const items: RemoteNavItem[] = flatten(manifest.nav.flatMap((section) => section.items));
    const groups: RemoteNavItem[] = items.filter((item) => item.children);
    const leaves: RemoteNavItem[] = items.filter((item) => !item.children);

    expect(groups.map((group) => group.path)).toEqual(groups.map(() => undefined));
    expect(groups.every((group) => (group.children?.length ?? 0) > 0)).toBe(true);
    expect(leaves.length).toBeGreaterThan(0);
    expect(leaves.every((leaf) => leaf.path?.startsWith('/'))).toBe(true);
  });

  it('carries no React elements, so a host can serialize it', () => {
    expect(() => JSON.stringify(manifest)).not.toThrow();
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest);
  });
});
