import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function NutritionScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Lebensmittel über Suche, Barcode oder Foto-KI erfassen — dieselben APIs
        wie in der Web-App (`/api/food/*`, `/api/nutrition/*`).
      </Text>
      <Link href="/barcode" style={styles.link}>
        Kamera-Barcode öffnen
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#09090b" },
  text: { color: "#a1a1aa", lineHeight: 20, marginBottom: 16 },
  link: { color: "#67e8f9", fontWeight: "600" },
});
