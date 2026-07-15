/*
 * ErrorBoundary — ловит ошибки рендера в дочерних компонентах
 */
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// TODO: Class component — cannot use hooks. Keep Russian string until migrated to a function component or error.tsx boundary.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-6 text-center text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            Произошла ошибка. Попробуйте перезагрузить страницу.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
