import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { friendRequestSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
      },
      include: {
        initiator: { select: { id: true, name: true, email: true, image: true } },
        receiver: { select: { id: true, name: true, email: true, image: true } },
      },
    });
    return jsonOk({ friends });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = friendRequestSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige E-Mail");

    const receiver = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!receiver) return jsonError("Nutzer nicht gefunden");
    if (receiver.id === session.user.id) return jsonError("Du kannst dich nicht selbst hinzufügen");

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { initiatorId: session.user.id, receiverId: receiver.id },
          { initiatorId: receiver.id, receiverId: session.user.id },
        ],
      },
    });
    if (existing) return jsonError("Freundschaft existiert bereits");

    const friend = await prisma.friend.create({
      data: {
        initiatorId: session.user.id,
        receiverId: receiver.id,
        status: "PENDING",
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiver.id,
        type: "FRIEND_REQUEST",
        title: "Neue Freundschaftsanfrage",
        message: "Jemand möchte dich als Freund hinzufügen",
        link: "/social",
      },
    });

    return jsonOk({ friend }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id, action } = await req.json();
    const friend = await prisma.friend.findFirst({
      where: { id, receiverId: session.user.id },
    });
    if (!friend) return jsonError("Anfrage nicht gefunden");
    if (action === "accept") {
      await prisma.friend.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });
    } else if (action === "reject") {
      await prisma.friend.delete({ where: { id } });
    }
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
