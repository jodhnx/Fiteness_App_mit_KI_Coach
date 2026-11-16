import { useEffect, useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../src/lib/api";

type Dash = {
  targets?: { calories?: number; proteinG?: number };
  consumed?: { calories?: number; proteinG?: number };
  remaining?: { calories?: number; proteinG?: number };
};

export default function HomeScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/nutrition/dashboard");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? `HTTP ${res.status}`);
          return;
        }
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled)
          setError("Backend nicht erreichbar — apiBaseUrl prüfen.");
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {data && (
        <View style={styles.card}>
          <Text style={styles.title}>Heute</Text>
          <Text style={styles.row}>
            Kalorien: {Math.round(data.consumed?.calories ?? 0)} /{" "}
            {data.targets?.calories ?? "—"}
          </Text>
          <Text style={styles.row}>
            Protein: {Math.round(data.consumed?.proteinG ?? 0)} /{" "}
            {data.targets?.proteinG ?? "—"} g
          </Text>
          <Text style={styles.muted}>
            Offen: {Math.round(data.remaining?.calories ?? 0)} kcal ·{" "}
            {Math.round(data.remaining?.proteinG ?? 0)} g P
          </Text>
        </View>
      )}
      <Link href="/nutrition" style={styles.link}>
        Ernährung
      </Link>
      <Link href="/barcode" style={styles.link}>
        Barcode scannen
      </Link>
      <Link href="/workouts" style={styles.link}>
        Training
      </Link>
      <Link href="/progress" style={styles.link}>
        Fortschritt
      </Link>
      <Link href="/coach" style={styles.link}>
        AI Coach
      </Link>
      <Link href="/devices" style={styles.link}>
        Wearables
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 10, backgroundColor: "#09090b" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 16,
    marginBottom: 8,
  },
  title: { color: "#fff", fontWeight: "700", marginBottom: 8 },
  row: { color: "#e4e4e7", marginBottom: 4 },
  muted: { color: "#71717a", marginTop: 6 },
  link: {
    color: "#67e8f9",
    paddingVertical: 10,
    fontWeight: "600",
  },
  error: { color: "#fbbf24" },
});
