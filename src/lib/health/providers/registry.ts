import type { WearableProvider } from "@prisma/client";
import type { ProviderMeta } from "@/lib/health/types";

export const HEALTH_PROVIDERS: ProviderMeta[] = [
  {
    id: "APPLE_HEALTH",
    name: "Apple Health",
    manufacturer: "Apple",
    platform: "native_bridge",
    color: "text-red-400",
    description: "HealthKit · Apple Watch & iPhone",
    apiNote: "HealthKit Bridge (iOS Companion)",
  },
  {
    id: "GOOGLE_HEALTH_CONNECT",
    name: "Health Connect",
    manufacturer: "Google",
    platform: "native_bridge",
    color: "text-green-400",
    description: "Android Health Connect · zentrale Gesundheitsdaten",
    apiNote: "Health Connect API",
  },
  {
    id: "GOOGLE_FIT",
    name: "Google Fit",
    manufacturer: "Google",
    platform: "web_oauth",
    color: "text-lime-400",
    description: "Google Fit REST API · Schritte, HF, Schlaf",
    apiNote: "Google Fit API (OAuth)",
  },
  {
    id: "SAMSUNG_HEALTH",
    name: "Samsung Health",
    manufacturer: "Samsung",
    platform: "native_bridge",
    color: "text-indigo-400",
    description: "Galaxy Watch · Aktivität & Schlaf",
    apiNote: "Samsung Health SDK Bridge",
  },
  {
    id: "FITBIT",
    name: "Fitbit",
    manufacturer: "Google / Fitbit",
    platform: "web_oauth",
    color: "text-teal-400",
    description: "Fitbit Web API · Schritte, Schlaf, Herzfrequenz",
    apiNote: "Fitbit Web API (OAuth)",
  },
  {
    id: "GARMIN",
    name: "Garmin",
    manufacturer: "Garmin",
    platform: "web_oauth",
    color: "text-blue-400",
    description: "Garmin Health API · Training, Puls, Schlaf",
    apiNote: "Garmin Connect OAuth2",
  },
  {
    id: "POLAR",
    name: "Polar",
    manufacturer: "Polar",
    platform: "web_oauth",
    color: "text-rose-400",
    description: "Polar AccessLink · Training & Erholung",
    apiNote: "Polar AccessLink (OAuth)",
  },
  {
    id: "COROS",
    name: "COROS",
    manufacturer: "COROS",
    platform: "web_oauth",
    color: "text-amber-400",
    description: "COROS Open API · Laufen, Rad, Erholung",
    apiNote: "COROS Open API (OAuth)",
  },
  {
    id: "HUAWEI_HEALTH",
    name: "Huawei Health",
    manufacturer: "Huawei",
    platform: "native_bridge",
    color: "text-orange-400",
    description: "Huawei Health Kit",
    apiNote: "Huawei Health Kit Bridge",
  },
  {
    id: "WEAR_OS",
    name: "Wear OS",
    manufacturer: "Google",
    platform: "native_bridge",
    color: "text-cyan-400",
    description: "Wear OS über Health Connect / Google Fit",
    apiNote: "Wear OS + Health Connect",
  },
  {
    id: "SUUNTO",
    name: "Suunto",
    manufacturer: "Suunto",
    platform: "web_oauth",
    color: "text-sky-400",
    description: "Suunto Cloud API · Outdoor & Training",
    apiNote: "Suunto API (OAuth)",
  },
];

export function getProviderMeta(id: WearableProvider): ProviderMeta | undefined {
  return HEALTH_PROVIDERS.find((p) => p.id === id);
}

export const ALL_PROVIDER_IDS = HEALTH_PROVIDERS.map((p) => p.id);
