import { StyleSheet, Text, View } from "react-native";

export default function ProgressScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        Gewicht via `POST /api/progress` speichern — erscheint danach in Web und Mobile.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#09090b" },
  text: { color: "#a1a1aa", lineHeight: 20 },
});
