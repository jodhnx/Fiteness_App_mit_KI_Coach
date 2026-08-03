import { createHmac, timingSafeEqual } from "crypto";
import type { WearableProvider } from "@prisma/client";

const STATE_TTL_MS = 15 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("AUTH_SECRET fehlt für OAuth-State");
  return s;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", secret()).update(payloadB64).digest("base64url");
}

/** Signed OAuth state bound to user + provider + expiry. */
export function createWearableOAuthState(
  userId: string,
  provider: WearableProvider
): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      provider,
      exp: Date.now() + STATE_TTL_MS,
      n: Math.random().toString(36).slice(2),
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyWearableOAuthState(
  state: string,
  expectedProvider: WearableProvider
): { userId: string; provider: WearableProvider } | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;

  let expectedSig: string;
  try {
    expectedSig = sign(payload);
  } catch {
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      userId?: string;
      provider?: string;
      exp?: number;
    };
    if (!decoded.userId || !decoded.provider || !decoded.exp) return null;
    if (decoded.exp < Date.now()) return null;
    if (decoded.provider !== expectedProvider) return null;
    return { userId: decoded.userId, provider: expectedProvider };
  } catch {
    return null;
  }
}
