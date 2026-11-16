import { StyleSheet, Text, View } from "react-native";

export default function CoachScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Coach über `/api/coach/chat` — lokale Engine oder OpenAI, je nach Server-Konfiguration.
        Keine simulierten Coach-Antworten in der App.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#09090b" },
  text: { color: "#a1a1aa", lineHeight: 20 },
});
