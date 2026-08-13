import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { normalizeUsername, usernameError } from "@/lib/username";

/** GET ?u=name — check availability. POST { username } — claim/update for current user. */
export async function GET(req: NextRequest) {
  try {
    const u = normalizeUsername(req.nextUrl.searchParams.get("u") ?? "");
    const err = usernameError(u);
    if (err) return jsonOk({ available: false, error: err });

    const session = await auth();
    const existing = await prisma.user.findUnique({
      where: { username: u },
      select: { id: true },
    });
    const available = !existing || existing.id === session?.user?.id;
    return jsonOk({
      available,
      error: available ? null : "Dieser Benutzername ist bereits vergeben.",
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json().catch(() => ({}));
    const u = normalizeUsername(String(body.username ?? ""));
    const err = usernameError(u);
    if (err) return jsonError(err, 400);

    const taken = await prisma.user.findUnique({
      where: { username: u },
      select: { id: true },
    });
    if (taken && taken.id !== session.user.id) {
      return jsonError("Dieser Benutzername ist bereits vergeben.", 409);
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { username: u },
    });
    return jsonOk({ username: u });
  } catch (e) {
    return handleApiError(e);
  }
}
