// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import EmbedErrorBoundary from '../EmbedErrorBoundary';

function Broken(): never {
  throw new Error('page exploded');
}

describe('EmbedErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children while nothing fails', () => {
    render(
      <EmbedErrorBoundary>
        <span>page</span>
      </EmbedErrorBoundary>,
    );

    expect(screen.getByText('page')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('contains a render failure and reports it, instead of blanking the host page', () => {
    const onError = vi.fn();

    render(
      <EmbedErrorBoundary onError={onError}>
        <Broken />
      </EmbedErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('ThunderID Console could not render this page.');
    expect(screen.getByRole('alert')).toHaveTextContent('page exploded');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'page exploded'}), expect.anything());
  });
});
