import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>NEXFORM</Text>
      <Text style={styles.sub}>Companion App · gleiche Daten wie die Web-App</Text>
      <Link href="/login" style={styles.btn}>
        Anmelden
      </Link>
      <Link href="/home" style={styles.link}>
        Weiter zum Dashboard
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#09090b",
  },
  brand: { color: "#22d3ee", fontSize: 32, fontWeight: "800" },
  sub: { color: "#a1a1aa", marginBottom: 16 },
  btn: {
    backgroundColor: "#0891b2",
    color: "#fff",
    textAlign: "center",
    paddingVertical: 14,
    borderRadius: 14,
    fontWeight: "700",
    overflow: "hidden",
  },
  link: { color: "#e4e4e7", textAlign: "center", marginTop: 8 },
});
