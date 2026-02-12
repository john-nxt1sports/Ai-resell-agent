"use client";

import React, {
  Component,
  ErrorInfo,
  ReactNode,
  useCallback,
  useState,
} from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // When Sentry is configured, errors will be sent automatically
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-gray-900">
            <div className="text-center p-8 rounded-lg bg-gray-800 max-w-md mx-4">
              <div className="text-6xl mb-4">😵</div>
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                Something went wrong
              </h1>
              <p className="text-gray-300 mb-6">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                    window.location.reload();
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reload Page
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for functional components to throw errors to the nearest ErrorBoundary
 * @example
 * const throwError = useErrorHandler();
 * throwError(new Error('Something went wrong'));
 */
export function useErrorHandler() {
  const [, setError] = useState<Error>();

  return useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

/**
 * HOC to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
