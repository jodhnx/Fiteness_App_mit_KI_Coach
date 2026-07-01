import type { WearableProvider } from "@prisma/client";
import type {
  HealthDaySnapshot,
  ProviderSyncResult,
  WearableWorkoutSnapshot,
} from "@/lib/health/types";

export type ProviderConnection = {
  accessToken: string | null;
  refreshToken: string | null;
  metadata: Record<string, unknown> | null;
};

export interface HealthProviderAdapter {
  readonly provider: WearableProvider;
  getOAuthUrl?(redirectUri: string, state: string): string | null;
  exchangeCode?(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }>;
  fetchDayMetrics(
    connection: ProviderConnection,
    since: Date
  ): Promise<HealthDaySnapshot[]>;
  fetchWorkouts?(
    connection: ProviderConnection,
    since: Date
  ): Promise<WearableWorkoutSnapshot[]>;
  sync(
    userId: string,
    connection: ProviderConnection,
    since: Date
  ): Promise<ProviderSyncResult>;
}
