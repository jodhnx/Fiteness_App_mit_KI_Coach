"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

/**
 * Isolates a single page/section crash so the shell (nav, header) stays usable.
 * Logs the real error — does not paper over bugs silently.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[AppErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md px-2 py-10 text-center space-y-4">
          <p className="text-base font-semibold text-white">Bereich konnte nicht geladen werden</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Die restliche App funktioniert weiter. Bitte diesen Bereich erneut versuchen.
          </p>
          <Button
            type="button"
            variant="premium"
            className="w-full"
            onClick={() => this.setState({ error: null })}
          >
            Erneut versuchen
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              this.setState({ error: null });
              if (typeof window !== "undefined") window.location.href = "/home";
            }}
          >
            Zur Startseite
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
