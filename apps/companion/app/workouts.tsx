import { StyleSheet, Text, View } from "react-native";

export default function WorkoutsScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Training über `/api/workouts/*` starten und Sätze dokumentieren. Offline-Drafts
        lokal puffern und nach Verbindungsende ohne Duplikate syncen.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#09090b" },
  text: { color: "#a1a1aa", lineHeight: 20 },
});
