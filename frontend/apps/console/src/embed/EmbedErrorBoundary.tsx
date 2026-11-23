// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Component, type ErrorInfo, type ReactNode} from 'react';

export interface EmbedErrorBoundaryProps {
  /** Receives every error the boundary catches, so the console can log it. */
  onError?: (error: Error, info: ErrorInfo) => void;
  children: ReactNode;
}

interface EmbedErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps a failure inside the embedded console from blanking the host's page. Standalone, a render
 * error takes down the whole tab and the browser shows it; embedded, the console shares the page
 * with the host, so the failure is contained here and the host's chrome stays usable.
 */
export default class EmbedErrorBoundary extends Component<EmbedErrorBoundaryProps, EmbedErrorBoundaryState> {
  state: EmbedErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): EmbedErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): ReactNode {
    const {error} = this.state;

    if (error) {
      return (
        <div role="alert" data-testid="thunderid-embed-error">
          <p>ThunderID Console could not render this page.</p>
          <pre>{error.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
