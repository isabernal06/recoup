import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './StateViews';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches unexpected rendering errors so a bug in one screen shows a recovery
 * message instead of a blank page. Failed requests are *not* handled here:
 * they are expected, and each screen renders them next to the data they affect.
 *
 * Error boundaries are still the one feature that requires a class component.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this is where the error would be sent to a monitoring service.
    console.error('Unexpected rendering error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <ErrorState
          title="This screen ran into a problem"
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
