import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../src/lib/api";

export default function DevicesScreen() {
  const [text, setText] = useState("Lade Provider…");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/wearables");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setText(data.error ?? "Wearables API nicht verfügbar");
          return;
        }
        const providers = data.providers ?? data.availability ?? [];
        if (!cancelled) {
          setText(
            Array.isArray(providers) && providers.length
              ? providers
                  .map(
                    (p: { name?: string; id?: string; connectable?: boolean; availabilityNote?: string }) =>
                      `${p.name ?? p.id}: ${
                        p.connectable ? "verbindbar" : "nicht konfiguriert"
                      }${p.availabilityNote ? ` — ${p.availabilityNote}` : ""}`
                  )
                  .join("\n\n")
              : "Keine Provider-Daten — Serverantwort prüfen."
          );
        }
      } catch {
        if (!cancelled) setText("Backend nicht erreichbar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.wrap}>
      {loading && <ActivityIndicator color="#22d3ee" />}
      <Text style={styles.text}>{text}</Text>
      <Text style={styles.hint}>
        Apple Health / Health Connect: Daten nur nach echtem Companion-Ingest an
        `/api/health/ingest`. Keine Fake-Verbindungen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 12, backgroundColor: "#09090b" },
  text: { color: "#e4e4e7", lineHeight: 20 },
  hint: { color: "#71717a", fontSize: 12, lineHeight: 18 },
});
