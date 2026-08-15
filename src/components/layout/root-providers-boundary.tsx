"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

function isChunkError(error: Error) {
  const msg = `${error?.name ?? ""} ${error?.message ?? ""}`;
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
}

/**
 * Last client-side net before Next.js global-error.tsx.
 * Plain HTML only — never import UI kits here.
 */
export class RootProvidersBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[RootProvidersBoundary]", error.message, info.componentStack);
    try {
      sessionStorage.setItem(
        "nexform:last-error",
        JSON.stringify({
          label: "root-providers",
          name: error.name,
          message: error.message,
          stack: error.stack?.slice(0, 500),
          at: Date.now(),
        })
      );
    } catch {
      /* ignore */
    }

    if (typeof window !== "undefined" && isChunkError(error)) {
      try {
        if (!sessionStorage.getItem("nexform:chunk-reload")) {
          sessionStorage.setItem("nexform:chunk-reload", "1");
          if ("serviceWorker" in navigator) {
            void navigator.serviceWorker
              .getRegistrations()
              .then((regs) => Promise.all(regs.map((r) => r.unregister())))
              .finally(() => window.location.reload());
          } else {
            window.location.reload();
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "Unbekannter Fehler";
      return (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#09090b",
            color: "#fafafa",
            fontFamily: "system-ui,sans-serif",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 380 }}>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              Bereich konnte nicht geladen werden
            </p>
            <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 12, wordBreak: "break-word" }}>
              {msg}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.href = "/home";
              }}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 16,
                border: "none",
                background: "#22d3ee",
                color: "#09090b",
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Zur Startseite
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 16,
                border: "1px solid #3f3f46",
                background: "transparent",
                color: "#e4e4e7",
              }}
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
