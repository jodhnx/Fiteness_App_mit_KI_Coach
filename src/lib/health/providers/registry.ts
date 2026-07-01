import type { WearableProvider } from "@prisma/client";
import type { ProviderMeta } from "@/lib/health/types";

export const HEALTH_PROVIDERS: ProviderMeta[] = [
  {
    id: "APPLE_HEALTH",
    name: "Apple Watch",
    platform: "native_bridge",
    color: "text-red-400",
    description: "Apple HealthKit · Schritte, Schlaf, Herzfrequenz, Workouts",
    apiNote: "HealthKit (iOS Companion)",
  },
  {
    id: "SAMSUNG_HEALTH",
    name: "Samsung Galaxy Watch",
    platform: "native_bridge",
    color: "text-indigo-400",
    description: "Samsung Health SDK · Aktivität & Schlaf",
    apiNote: "Samsung Health SDK",
  },
  {
    id: "GARMIN",
    name: "Garmin",
    platform: "web_oauth",
    color: "text-blue-400",
    description: "Garmin Health API · Training, Puls, Schlaf",
    apiNote: "Garmin Health API",
  },
  {
    id: "FITBIT",
    name: "Fitbit",
    platform: "web_oauth",
    color: "text-teal-400",
    description: "Fitbit Web API · Schritte, Schlaf, Herzfrequenz",
    apiNote: "Fitbit Web API",
  },
  {
    id: "POLAR",
    name: "Polar",
    platform: "web_oauth",
    color: "text-rose-400",
    description: "Polar AccessLink API",
    apiNote: "Polar AccessLink",
  },
  {
    id: "HUAWEI_HEALTH",
    name: "Huawei Health",
    platform: "native_bridge",
    color: "text-orange-400",
    description: "Huawei Health Kit",
    apiNote: "Huawei Health Kit",
  },
  {
    id: "GOOGLE_HEALTH_CONNECT",
    name: "Google Health Connect",
    platform: "native_bridge",
    color: "text-green-400",
    description: "Android Health Connect · zentrale Gesundheitsdaten",
    apiNote: "Health Connect API",
  },
  {
    id: "GOOGLE_FIT",
    name: "Google Fit",
    platform: "web_oauth",
    color: "text-lime-400",
    description: "Google Fit REST API",
    apiNote: "Google Fit API",
  },
  {
    id: "WEAR_OS",
    name: "Wear OS",
    platform: "native_bridge",
    color: "text-cyan-400",
    description: "Wear OS · über Health Connect / Google Fit",
    apiNote: "Wear OS + Health Connect",
  },
  {
    id: "COROS",
    name: "COROS",
    platform: "web_oauth",
    color: "text-amber-400",
    description: "COROS API · Laufen, Rad, Erholung",
    apiNote: "COROS Open API",
  },
  {
    id: "SUUNTO",
    name: "Suunto",
    platform: "web_oauth",
    color: "text-sky-400",
    description: "Suunto API · Outdoor & Training",
    apiNote: "Suunto API",
  },
];

export function getProviderMeta(id: WearableProvider): ProviderMeta | undefined {
  return HEALTH_PROVIDERS.find((p) => p.id === id);
}

export const ALL_PROVIDER_IDS = HEALTH_PROVIDERS.map((p) => p.id);
