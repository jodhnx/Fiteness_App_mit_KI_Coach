import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import type { AppThemeId, ColorMode, UiDensity } from "@/lib/themes";
import {
  APP_THEMES,
  UI_DENSITY_OPTIONS,
  DEFAULT_THEME,
  DEFAULT_DENSITY,
  DEFAULT_COLOR_MODE,
} from "@/lib/themes";

const themeIds = APP_THEMES.map((t) => t.id) as [AppThemeId, ...AppThemeId[]];

const patchSchema = z.object({
  theme: z.enum(themeIds).optional(),
  uiDensity: z.enum(["compact", "standard", "large"]).optional(),
  colorMode: z.enum(["dark", "light"]).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { theme: true, uiDensity: true, colorMode: true },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: { userId: session.user.id },
        select: { theme: true, uiDensity: true, colorMode: true },
      });
    }

    const theme = (profile.theme as AppThemeId) || DEFAULT_THEME;
    const uiDensity = (profile.uiDensity as UiDensity) || DEFAULT_DENSITY;
    const colorMode: ColorMode = profile.colorMode === "light" ? "light" : "dark";

    return jsonOk({
      theme: APP_THEMES.some((t) => t.id === theme) ? theme : DEFAULT_THEME,
      uiDensity: UI_DENSITY_OPTIONS.some((d) => d.id === uiDensity)
        ? uiDensity
        : DEFAULT_DENSITY,
      colorMode: colorMode ?? DEFAULT_COLOR_MODE,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        theme: parsed.data.theme ?? DEFAULT_THEME,
        uiDensity: parsed.data.uiDensity ?? DEFAULT_DENSITY,
        colorMode: parsed.data.colorMode ?? DEFAULT_COLOR_MODE,
      },
      update: parsed.data,
      select: { theme: true, uiDensity: true, colorMode: true },
    });

    return jsonOk({
      theme: profile.theme,
      uiDensity: profile.uiDensity,
      colorMode: profile.colorMode,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
