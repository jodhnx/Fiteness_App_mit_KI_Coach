import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#09090b" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#09090b" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "NEXFORM" }} />
        <Stack.Screen name="login" options={{ title: "Anmelden" }} />
        <Stack.Screen name="home" options={{ title: "Home" }} />
        <Stack.Screen name="nutrition" options={{ title: "Ernährung" }} />
        <Stack.Screen name="barcode" options={{ title: "Barcode" }} />
        <Stack.Screen name="workouts" options={{ title: "Training" }} />
        <Stack.Screen name="progress" options={{ title: "Fortschritt" }} />
        <Stack.Screen name="coach" options={{ title: "Coach" }} />
        <Stack.Screen name="devices" options={{ title: "Geräte" }} />
      </Stack>
    </>
  );
}
