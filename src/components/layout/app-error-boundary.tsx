"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

/** Catches render errors so one broken panel does not take down the whole app. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[AppErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
          <p className="text-lg font-semibold text-white">Etwas ist schiefgelaufen</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Dieser Bereich konnte nicht geladen werden. Deine Daten sind sicher — bitte erneut
            versuchen.
          </p>
          <Button
            type="button"
            variant="premium"
            className="w-full"
            onClick={() => {
              this.setState({ error: null });
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            Erneut versuchen
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => this.setState({ error: null })}
          >
            Bereich neu rendern
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
