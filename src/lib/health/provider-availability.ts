/**
 * Provider availability — never pretend OAuth works without credentials.
 */

import type { WearableProvider } from "@prisma/client";
import type { ProviderMeta } from "@/lib/health/types";
import { HEALTH_PROVIDERS } from "@/lib/health/providers/registry";

export type ProviderAvailability = ProviderMeta & {
  /** Can the user attempt a connection right now? */
  connectable: boolean;
  /** Why connect is blocked or how it works */
  availabilityNote: string;
  mode: "oauth" | "native_bridge" | "unavailable";
};

function oauthConfigured(provider: WearableProvider): boolean {
  switch (provider) {
    case "FITBIT":
      return Boolean(process.env.FITBIT_CLIENT_ID && process.env.FITBIT_CLIENT_SECRET);
    case "GOOGLE_FIT":
      return Boolean(
        (process.env.GOOGLE_FIT_CLIENT_ID || process.env.AUTH_GOOGLE_ID) &&
          (process.env.GOOGLE_FIT_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET)
      );
    case "GARMIN":
      return Boolean(process.env.GARMIN_CLIENT_ID && process.env.GARMIN_CLIENT_SECRET);
    case "POLAR":
      return Boolean(process.env.POLAR_CLIENT_ID && process.env.POLAR_CLIENT_SECRET);
    case "COROS":
      return Boolean(process.env.COROS_CLIENT_ID && process.env.COROS_CLIENT_SECRET);
    case "SUUNTO":
      return Boolean(process.env.SUUNTO_CLIENT_ID && process.env.SUUNTO_CLIENT_SECRET);
    default:
      return false;
  }
}

export function getProviderAvailabilityList(): ProviderAvailability[] {
  return HEALTH_PROVIDERS.map((p) => {
    if (p.platform === "web_oauth") {
      const ok = oauthConfigured(p.id);
      return {
        ...p,
        connectable: ok,
        mode: ok ? "oauth" : "unavailable",
        availabilityNote: ok
          ? "OAuth bereit — Verbinden startet die Anmeldung beim Anbieter."
          : "Nicht verfügbar — API-Credentials fehlen in der Server-Konfiguration.",
      };
    }

    // Native bridge: supported via /api/health/ingest companion path
    return {
      ...p,
      connectable: true,
      mode: "native_bridge",
      availabilityNote:
        "Native Bridge — Sync über Companion (HealthKit / Health Connect). Ohne Companion keine Live-Daten.",
    };
  });
}
