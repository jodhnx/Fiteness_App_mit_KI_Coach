"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

function isChunkError(error: Error) {
  const msg = `${error?.name ?? ""} ${error?.message ?? ""}`;
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/**
 * Isolates render crashes. Fallback uses plain HTML only — never imports UI
 * kits — so a failed chunk cannot break the recovery UI into global-error.
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
    try {
      sessionStorage.setItem(
        "nexform:last-error",
        JSON.stringify({
          label: this.props.label ?? "unknown",
          name: error.name,
          message: error.message,
          at: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }

    // Stale deploy / SW: one automatic recovery reload
    if (typeof window !== "undefined" && isChunkError(error)) {
      const key = "nexform:chunk-reload";
      try {
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          window.location.reload();
        }
      } catch {
        /* ignore */
      }
    }
  }

  render() {
    if (this.state.error) {
      const chunk = isChunkError(this.state.error);
      return (
        <div className="mx-auto max-w-md px-2 py-10 text-center space-y-4">
          <p className="text-base font-semibold text-white">
            {chunk ? "App-Update wird geladen…" : "Bereich konnte nicht geladen werden"}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {chunk
              ? "Eine neue Version ist verfügbar. Bitte kurz neu laden."
              : "Die Navigation bleibt nutzbar. Bitte diesen Bereich erneut versuchen."}
          </p>
          <button
            type="button"
            className="w-full h-11 rounded-2xl bg-cyan-400 text-zinc-950 font-semibold"
            onClick={() => {
              this.setState({ error: null });
              if (chunk && typeof window !== "undefined") window.location.reload();
            }}
          >
            Erneut versuchen
          </button>
          <button
            type="button"
            className="w-full h-11 rounded-2xl border border-zinc-700 text-zinc-200"
            onClick={() => {
              this.setState({ error: null });
              if (typeof window !== "undefined") window.location.href = "/home";
            }}
          >
            Zur Startseite
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
