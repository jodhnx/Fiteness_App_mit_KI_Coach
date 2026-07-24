import type { WearableProvider } from "@prisma/client";
import {
  exchangeFitbitCode,
  getFitbitOAuthUrl,
} from "@/lib/health/providers/fitbit-provider";
import {
  exchangeGoogleFitCode,
  getGoogleFitOAuthUrl,
} from "@/lib/health/providers/google-fit-provider";
import {
  exchangeGarminCode,
  getGarminOAuthUrl,
} from "@/lib/health/providers/garmin-provider";
import {
  exchangePolarCode,
  getPolarOAuthUrl,
} from "@/lib/health/providers/polar-provider";
import {
  exchangeCorosCode,
  getCorosOAuthUrl,
} from "@/lib/health/providers/coros-provider";
import {
  exchangeSuuntoCode,
  getSuuntoOAuthUrl,
} from "@/lib/health/providers/suunto-provider";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  extra?: Record<string, unknown>;
};

/** Modular OAuth URL resolver — add providers here. */
export function getProviderOAuthUrl(
  provider: WearableProvider,
  redirectUri: string,
  state: string
): string | null {
  switch (provider) {
    case "FITBIT":
      return getFitbitOAuthUrl(redirectUri, state);
    case "GOOGLE_FIT":
      return getGoogleFitOAuthUrl(redirectUri, state);
    case "GARMIN":
      return getGarminOAuthUrl(redirectUri, state);
    case "POLAR":
      return getPolarOAuthUrl(redirectUri, state);
    case "COROS":
      return getCorosOAuthUrl(redirectUri, state);
    case "SUUNTO":
      return getSuuntoOAuthUrl(redirectUri, state);
    default:
      return null;
  }
}

export async function exchangeProviderCode(
  provider: WearableProvider,
  code: string,
  redirectUri: string
): Promise<OAuthTokens | null> {
  switch (provider) {
    case "FITBIT":
      return exchangeFitbitCode(code, redirectUri);
    case "GOOGLE_FIT":
      return exchangeGoogleFitCode(code, redirectUri);
    case "GARMIN":
      return exchangeGarminCode(code, redirectUri);
    case "POLAR":
      return exchangePolarCode(code, redirectUri);
    case "COROS":
      return exchangeCorosCode(code, redirectUri);
    case "SUUNTO":
      return exchangeSuuntoCode(code, redirectUri);
    default:
      return null;
  }
}

export function providerFromPathParam(param: string): WearableProvider | null {
  const map: Record<string, WearableProvider> = {
    fitbit: "FITBIT",
    google_fit: "GOOGLE_FIT",
    garmin: "GARMIN",
    polar: "POLAR",
    coros: "COROS",
    suunto: "SUUNTO",
  };
  return map[param.toLowerCase()] ?? null;
}

export const WEB_OAUTH_PROVIDERS: WearableProvider[] = [
  "FITBIT",
  "GARMIN",
  "POLAR",
  "GOOGLE_FIT",
  "COROS",
  "SUUNTO",
];

export const NATIVE_BRIDGE_PROVIDERS: WearableProvider[] = [
  "APPLE_HEALTH",
  "SAMSUNG_HEALTH",
  "GOOGLE_HEALTH_CONNECT",
  "HUAWEI_HEALTH",
  "WEAR_OS",
];
