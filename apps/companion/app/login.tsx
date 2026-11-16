import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { loginWithCredentials } from "../src/lib/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError("");
    const res = await loginWithCredentials(email.trim(), password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Login fehlgeschlagen");
      return;
    }
    router.replace("/home");
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>E-Mail</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Passwort</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={() => void onSubmit()} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Anmelden</Text>
        )}
      </Pressable>
      <Text style={styles.hint}>
        Nutzt dasselbe Konto wie die Web-App. Ohne erreichbares Backend schlägt der Login fehl —
        keine Demo-Anmeldung.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 8, backgroundColor: "#09090b" },
  label: { color: "#a1a1aa", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#3f3f46",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    backgroundColor: "#18181b",
  },
  btn: {
    marginTop: 16,
    backgroundColor: "#0891b2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  error: { color: "#fbbf24", marginTop: 8 },
  hint: { color: "#71717a", fontSize: 12, marginTop: 16, lineHeight: 18 },
});
