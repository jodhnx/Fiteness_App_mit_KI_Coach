import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { apiFetch } from "../src/lib/api";

export default function BarcodeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  if (!permission) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.text}>Kamerastatus wird geladen…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.text}>
          Kamerazugriff wird benötigt, um Barcodes zu scannen.
        </Text>
        <Pressable style={styles.btn} onPress={() => void requestPermission()}>
          <Text style={styles.btnText}>Erlaubnis anfordern</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
        }}
        onBarcodeScanned={
          locked
            ? undefined
            : (scan) => {
                const code = String(scan.data ?? "").replace(/\D/g, "");
                if (code.length < 8) return;
                setLocked(true);
                setError("");
                setResult("Suche…");
                void apiFetch(`/api/food/barcode/${encodeURIComponent(code)}`)
                  .then(async (res) => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok || !data.found) {
                      setError(
                        data.message ??
                          data.error ??
                          "Produkt nicht gefunden — manuell hinzufügen in der Web-App möglich."
                      );
                      setResult(code);
                      return;
                    }
                    setResult(
                      `${data.food?.name ?? "Produkt"} · ${Math.round(
                        data.food?.calories ?? 0
                      )} kcal/100g`
                    );
                  })
                  .catch(() => setError("Netzwerkfehler"))
                  .finally(() => {
                    setTimeout(() => setLocked(false), 2000);
                  });
              }
        }
      />
      <View style={styles.panel}>
        {result ? <Text style={styles.text}>{result}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.hint}>
          Keine Fake-Treffer — nur echte DB/Open-Food-Facts-Antworten.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#09090b" },
  camera: { flex: 1 },
  panel: { padding: 16, gap: 8 },
  text: { color: "#e4e4e7" },
  error: { color: "#fbbf24" },
  hint: { color: "#71717a", fontSize: 12 },
  btn: {
    marginTop: 12,
    backgroundColor: "#0891b2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
