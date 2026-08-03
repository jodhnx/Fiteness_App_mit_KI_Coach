import { pingDatabase } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api-response";

/** Public liveness probe — no secrets, no admin bootstrap, no inventory. */
export async function GET() {
  try {
    const connected = await pingDatabase();
    if (!connected) {
      return jsonError("Datenbank nicht erreichbar", 503);
    }
    return jsonOk({ status: "ok" });
  } catch {
    return jsonError("Service unavailable", 503);
  }
}
